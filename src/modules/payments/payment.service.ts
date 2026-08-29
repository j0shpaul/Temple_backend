import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Prisma, PaymentStatus, PaymentEntityType } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { CashfreeService } from "./cashfree.service";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private cashfree: CashfreeService,
  ) {}

  /**
   * Helper: Fulfill and confirm the associated business entity once payment is SUCCESS
   */
  private async fulfillEntityOnSuccess(
    tx: Prisma.TransactionClient,
    payment: any,
  ): Promise<void> {
    // 1. Puja / Seva / Darshan Booking
    if (payment.bookingId) {
      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          status: "CONFIRMED",
          qrToken: IdUtil.generateQRToken(),
          qrGeneratedAt: new Date(),
        },
      });
    }

    // 2. Donation & Receipt Generation
    if (payment.donationId) {
      const updatedDonation = await tx.donation.update({
        where: { id: payment.donationId },
        data: { status: "SUCCESS" },
        include: { cause: true, temple: true },
      });

      // Idempotently create donation receipt if not exists
      const existingReceipt = await tx.donationReceipt.findUnique({
        where: { donationId: payment.donationId },
      });

      if (!existingReceipt) {
        await tx.donationReceipt.create({
          data: {
            donationId: updatedDonation.id,
            receiptNumber: IdUtil.generateReceiptNumber(),
            amountPaise: updatedDonation.amountPaise,
            donorName: updatedDonation.isAnonymous
              ? "Anonymous"
              : updatedDonation.donorName || undefined,
            causeName: updatedDonation.cause?.name || "General Donation",
            templeName: updatedDonation.temple?.name || "Temple",
          },
        });
      }
    }

    // 3. Packaged Prasad Order
    if (payment.prasadOrderId) {
      const order = await tx.prasadOrder.findUnique({
        where: { id: payment.prasadOrderId },
        include: { items: true },
      });

      if (order && order.status === "PLACED") {
        // Confirm order and deduct inventory
        await tx.prasadOrder.update({
          where: { id: order.id },
          data: { status: "CONFIRMED" },
        });

        for (const item of order.items) {
          await tx.prasadProduct.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
            },
          });
        }
      }
    }

    // 4. Accommodation Booking
    if (payment.accommodationId) {
      await tx.accommodationBooking.update({
        where: { id: payment.accommodationId },
        data: {
          status: "CONFIRMED",
          qrToken: IdUtil.generateQRToken(),
        },
      });
    }
  }

  // ==========================================
  // CREATE PAYMENT FOR BOOKING
  // ==========================================
  async createPaymentForBooking(
    bookingId: string,
    userId: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== userId) {
      throw new BadRequestException("Booking does not belong to user");
    }
    if (booking.amountPaise <= 0) {
      throw new BadRequestException("Booking has no payment required");
    }
    if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
      throw new ConflictException("Booking already paid and confirmed");
    }

    return this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { bookingId },
      });

      if (
        existingPayment &&
        (existingPayment.status === "PENDING" ||
          existingPayment.status === ("PROCESSING" as any))
      ) {
        return ApiResponseDto.success({
          paymentId: existingPayment.id,
          orderId: existingPayment.razorpayOrderId,
          amountPaise: existingPayment.amountPaise,
          currency: existingPayment.currency,
          gateway: "CASHFREE",
        });
      }

      const orderId = `BK_${booking.reference}_${Date.now().toString(36).toUpperCase()}`;

      const cfOrder = await this.cashfree.createOrder({
        orderId,
        amount: booking.amountPaise,
        currency: "INR",
        customerId: booking.userId,
        customerName: booking.devoteeName || booking.user?.name || "Devotee",
        customerPhone: booking.devoteePhone || booking.user?.phone || "9999999999",
        customerEmail: booking.devoteeEmail || booking.user?.email || "devotee@temple.org",
        orderNote: `Booking payment: ${booking.reference}`,
      });

      const payment = await tx.payment.create({
        data: {
          bookingId,
          entityType: "PUJA_BOOKING",
          userId: booking.userId,
          amountPaise: booking.amountPaise,
          currency: "INR",
          status: "PENDING",
          razorpayOrderId: cfOrder.orderId,
          description: `Booking payment: ${booking.reference}`,
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: "ORDER_CREATED",
          status: "SUCCESS",
          amountPaise: payment.amountPaise,
          payload: cfOrder.raw || (cfOrder as any),
        },
      });

      return ApiResponseDto.success({
        paymentId: payment.id,
        orderId: cfOrder.orderId,
        paymentSessionId: cfOrder.paymentSessionId,
        amountPaise: payment.amountPaise,
        currency: payment.currency,
        gateway: "CASHFREE",
      });
    });
  }

  // ==========================================
  // CREATE PAYMENT FOR DONATION
  // ==========================================
  async createPaymentForDonation(
    donationId: string,
    userId: string,
    userPhone?: string,
    userEmail?: string,
  ): Promise<ApiResponseDto<any>> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
      include: { cause: true, user: true },
    });
    if (!donation) throw new NotFoundException("Donation not found");
    if (donation.amountPaise <= 0) {
      throw new BadRequestException("Donation amount must be positive");
    }

    const orderId = `DON_${donation.reference}_${Date.now().toString(36).toUpperCase()}`;

    const cfOrder = await this.cashfree.createOrder({
      orderId,
      amount: donation.amountPaise,
      currency: "INR",
      customerId: userId,
      customerName: donation.isAnonymous
        ? "Devotee"
        : donation.donorName || donation.user?.name || "Devotee",
      customerPhone: userPhone || donation.user?.phone || "9999999999",
      customerEmail: userEmail || donation.user?.email || "devotee@temple.org",
      orderNote: `Donation: ${donation.cause?.name || "General"}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        donationId: donation.id,
        entityType: "DONATION",
        userId,
        amountPaise: donation.amountPaise,
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: cfOrder.orderId,
        description: `Donation: ${donation.cause?.name || "General"}`,
      },
    });

    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType: "ORDER_CREATED",
        status: "SUCCESS",
        amountPaise: payment.amountPaise,
        payload: cfOrder.raw || (cfOrder as any),
      },
    });

    return ApiResponseDto.success({
      donationId: donation.id,
      paymentId: payment.id,
      reference: donation.reference,
      orderId: cfOrder.orderId,
      paymentSessionId: cfOrder.paymentSessionId,
      amountPaise: donation.amountPaise,
      currency: "INR",
      gateway: "CASHFREE",
    });
  }

  // ==========================================
  // CREATE PAYMENT FOR PRASAD ORDER
  // ==========================================
  async createPaymentForPrasadOrder(
    orderId: string,
    userId: string,
  ): Promise<ApiResponseDto<any>> {
    const order = await this.prisma.prasadOrder.findUnique({
      where: { id: orderId },
      include: { user: true, address: true },
    });
    if (!order) throw new NotFoundException("Prasad order not found");
    if (order.totalPaise <= 0) {
      throw new BadRequestException("Order has zero total amount");
    }

    const cfOrderId = `PR_${order.reference}_${Date.now().toString(36).toUpperCase()}`;

    const cfOrder = await this.cashfree.createOrder({
      orderId: cfOrderId,
      amount: order.totalPaise,
      currency: "INR",
      customerId: userId,
      customerName: order.user?.name || "Devotee",
      customerPhone: order.address?.phone || order.user?.phone || "9999999999",
      customerEmail: order.user?.email || "devotee@temple.org",
      orderNote: `Prasad Order: ${order.reference}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        prasadOrderId: order.id,
        entityType: "PRASAD_ORDER",
        userId,
        amountPaise: order.totalPaise,
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: cfOrder.orderId,
        description: `Prasad order: ${order.reference}`,
      },
    });

    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment.id,
        eventType: "ORDER_CREATED",
        status: "SUCCESS",
        amountPaise: payment.amountPaise,
        payload: cfOrder.raw || (cfOrder as any),
      },
    });

    return ApiResponseDto.success({
      orderId: order.id,
      paymentId: payment.id,
      cfOrderId: cfOrder.orderId,
      paymentSessionId: cfOrder.paymentSessionId,
      amountPaise: order.totalPaise,
      gateway: "CASHFREE",
    });
  }

  // ==========================================
  // PAYMENT RECONCILIATION & STATUS LOOKUP
  // (Server-Authoritative Check Against Cashfree)
  // ==========================================
  async reconcilePayment(
    paymentIdOrOrderId: string,
    requestUserId?: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentIdOrOrderId },
          { razorpayOrderId: paymentIdOrOrderId },
        ],
      },
      include: {
        booking: true,
        donation: true,
        prasadOrder: true,
        accommodation: true,
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment record not found");
    }

    // Access control
    if (
      requestUserId &&
      payment.userId !== requestUserId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")
    ) {
      throw new ForbiddenException("Cannot access another user's payment");
    }

    // If already in terminal SUCCESS state, return current status
    if (payment.status === "SUCCESS") {
      return ApiResponseDto.success({
        paymentId: payment.id,
        orderId: payment.razorpayOrderId,
        status: payment.status,
        amountPaise: payment.amountPaise,
        paidAt: payment.paidAt,
        message: "Payment confirmed successfully",
      });
    }

    // Reconcile with Cashfree status API
    const orderId = payment.razorpayOrderId;
    if (!orderId) {
      return ApiResponseDto.success({
        paymentId: payment.id,
        status: payment.status,
        message: "No provider order ID present",
      });
    }

    const orderStatus = await this.cashfree.fetchOrderStatus(orderId);
    const cfStatus = (orderStatus.orderStatus || "").toUpperCase();

    // Check if any payment attempt succeeded
    const successfulAttempt = (orderStatus.payments || []).find(
      (p) => p.status?.toUpperCase() === "SUCCESS",
    );

    if (cfStatus === "PAID" || successfulAttempt) {
      // Transactionally transition to SUCCESS and fulfill entity
      const updatedPayment = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            razorpayPaymentId: successfulAttempt?.id || undefined,
            paidAt: new Date(),
          },
        });

        await this.fulfillEntityOnSuccess(tx, payment);

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: "RECONCILED_SUCCESS",
            status: "SUCCESS",
            amountPaise: payment.amountPaise,
            payload: orderStatus as any,
          },
        });

        return updated;
      });

      return ApiResponseDto.success({
        paymentId: updatedPayment.id,
        orderId: updatedPayment.razorpayOrderId,
        status: "SUCCESS",
        amountPaise: updatedPayment.amountPaise,
        paidAt: updatedPayment.paidAt,
        message: "Payment verified and confirmed via reconciliation",
      });
    }

    if (
      cfStatus === "EXPIRED" ||
      cfStatus === "CANCELLED" ||
      cfStatus === "TERMINATED"
    ) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      return ApiResponseDto.success({
        paymentId: payment.id,
        orderId: payment.razorpayOrderId,
        status: "FAILED",
        amountPaise: payment.amountPaise,
        message: `Payment ${cfStatus.toLowerCase()} on gateway`,
      });
    }

    // Uncertain or still active state -> remains PENDING / PROCESSING
    return ApiResponseDto.success({
      paymentId: payment.id,
      orderId: payment.razorpayOrderId,
      status: payment.status,
      amountPaise: payment.amountPaise,
      message: "Payment is pending or awaiting confirmation",
    });
  }

  // ==========================================
  // WEBHOOK HANDLER (Idempotent & Secure)
  // ==========================================
  async handleWebhook(
    rawBody: string | any,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<ApiResponseDto<any>> {
    const signature =
      (headers["x-webhook-signature"] as string) ||
      (headers["x-cashfree-signature"] as string) ||
      "";
    const timestamp = (headers["x-webhook-timestamp"] as string) || "";

    const rawBodyString =
      typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

    // 1. Verify webhook signature
    const isValid = this.cashfree.verifyWebhookSignature(
      signature,
      rawBodyString,
      timestamp,
    );

    if (!isValid) {
      this.logger.warn("Cashfree webhook signature verification failed");
      throw new BadRequestException("Invalid webhook signature");
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const eventType = payload.type || payload.event || payload.eventType || "";
    const data = payload.data || payload;

    const orderId =
      data.order?.order_id ||
      data.order_id ||
      data.payment?.order_id ||
      payload.orderId;
    const paymentId =
      data.payment?.cf_payment_id ||
      data.cf_payment_id ||
      data.payment_id ||
      payload.paymentId;
    const eventId = String(
      payload.event_id || paymentId || `${orderId}_${eventType}_${Date.now()}`,
    );

    // 2. Idempotency check: if already processed, return early
    if (eventId) {
      const existingEvent = await this.prisma.paymentEvent.findFirst({
        where: { razorpayEventId: eventId },
      });
      if (existingEvent) {
        return ApiResponseDto.success({ status: "ALREADY_PROCESSED" });
      }
    }

    // Find payment record by provider orderId
    const payment = orderId
      ? await this.prisma.payment.findUnique({
          where: { razorpayOrderId: orderId },
          include: {
            booking: true,
            donation: true,
            prasadOrder: true,
            accommodation: true,
          },
        })
      : null;

    // Record webhook event
    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment?.id,
        eventType: eventType || "CASHFREE_WEBHOOK",
        razorpayEventId: eventId,
        status: "RECEIVED",
        amountPaise: data.payment?.payment_amount
          ? Math.round(Number(data.payment.payment_amount) * 100)
          : payment?.amountPaise,
        payload,
      },
    });

    if (!payment) {
      return ApiResponseDto.success({
        status: "IGNORED_UNKNOWN_PAYMENT",
        orderId,
      });
    }

    // 3. Handle Payment SUCCESS events
    const isSuccessEvent =
      eventType.includes("PAYMENT_SUCCESS") ||
      eventType.includes("SUCCESS") ||
      eventType === "order.paid" ||
      data.payment?.payment_status === "SUCCESS";

    if (isSuccessEvent) {
      if (payment.status !== "SUCCESS") {
        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: "SUCCESS",
              razorpayPaymentId: paymentId ? String(paymentId) : undefined,
              paidAt: new Date(),
            },
          });

          await this.fulfillEntityOnSuccess(tx, payment);

          await tx.paymentEvent.create({
            data: {
              paymentId: payment.id,
              eventType: "PAYMENT_CAPTURED",
              status: "SUCCESS",
              amountPaise: payment.amountPaise,
              payload,
            },
          });
        });
      }
      return ApiResponseDto.success({ status: "PROCESSED", state: "SUCCESS" });
    }

    // 4. Handle Payment FAILED events
    const isFailedEvent =
      eventType.includes("PAYMENT_FAILED") ||
      eventType.includes("FAILED") ||
      data.payment?.payment_status === "FAILED";

    if (isFailedEvent && payment.status !== "SUCCESS") {
      const failureReason =
        data.payment?.payment_message ||
        data.error_details?.error_description ||
        payload.message ||
        "Payment failed on gateway";

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason,
        },
      });
      return ApiResponseDto.success({ status: "PROCESSED", state: "FAILED" });
    }

    // 5. Handle USER_DROPPED / CANCELLED events
    const isCancelledEvent =
      eventType.includes("USER_DROPPED") ||
      eventType.includes("CANCELLED") ||
      data.payment?.payment_status === "USER_DROPPED";

    if (isCancelledEvent && payment.status !== "SUCCESS") {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: "CANCELLED" },
      });
      return ApiResponseDto.success({ status: "PROCESSED", state: "CANCELLED" });
    }

    return ApiResponseDto.success({ status: "PROCESSED" });
  }

  // ==========================================
  // GET PAYMENT BY ID
  // ==========================================
  async getPaymentById(id: string): Promise<ApiResponseDto<any>> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return ApiResponseDto.success(payment);
  }

  // ==========================================
  // GET USER PAYMENTS
  // ==========================================
  async getUserPayments(
    userId: string,
    params: { page?: number; limit?: number },
  ): Promise<ApiResponseDto<any>> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { events: { orderBy: { createdAt: "asc" } } },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return ApiResponseDto.success(
      { payments, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  // ==========================================
  // REFUND PAYMENT
  // ==========================================
  async refundPayment(
    paymentId: string,
    amountPaise?: number,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (actorRole && !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions to refund");
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "SUCCESS") {
      throw new BadRequestException("Payment is not in SUCCESS state for refund");
    }

    const refundAmount = amountPaise || payment.amountPaise;
    const refundId = `REF_${IdUtil.generateShortId(8)}_${Date.now()}`;

    const refund = await this.cashfree.refund(
      payment.razorpayOrderId || payment.id,
      refundId,
      refundAmount,
    );

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundAmountPaise: refundAmount,
      },
    });

    await this.prisma.paymentEvent.create({
      data: {
        paymentId,
        eventType: "REFUNDED",
        status: "SUCCESS",
        amountPaise: refundAmount,
        payload: refund as any,
      },
    });

    return ApiResponseDto.success(updated);
  }
}
