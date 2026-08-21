import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { RazorpayService } from "./razorpay.service";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  async createPaymentForBooking(
    bookingId: string,
    userId: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.userId !== userId)
      throw new BadRequestException("Booking does not belong to user");
    if (booking.amountPaise <= 0)
      throw new BadRequestException("Booking has no payment required");
    if (booking.status === "CONFIRMED" || booking.status === "COMPLETED") {
      throw new ConflictException("Booking already paid");
    }

    return this.prisma.$transaction(async (tx) => {
      // Check if payment already exists for this booking
      const existingPayment = await tx.payment.findUnique({
        where: { bookingId },
      });
      if (existingPayment && existingPayment.status !== "FAILED") {
        return ApiResponseDto.success({
          paymentId: existingPayment.id,
          razorpayOrderId: existingPayment.razorpayOrderId,
          amountPaise: existingPayment.amountPaise,
          currency: existingPayment.currency,
        });
      }

      const receipt = IdUtil.generateReceiptNumber();
      const order = await this.razorpay.createOrder({
        amount: booking.amountPaise,
        currency: "INR",
        receipt,
        notes: { bookingId, reference: booking.reference },
      });

      const payment = await tx.payment.create({
        data: {
          bookingId,
          entityType: "PUJA_BOOKING",
          userId: booking.userId,
          amountPaise: booking.amountPaise,
          currency: "INR",
          status: "PENDING",
          razorpayOrderId: order.id,
          description: `Booking payment: ${booking.reference}`,
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: "ORDER_CREATED",
          status: "SUCCESS",
          amountPaise: payment.amountPaise,
          payload: order as any,
        },
      });

      return ApiResponseDto.success({
        paymentId: payment.id,
        razorpayOrderId: order.id,
        amountPaise: payment.amountPaise,
        currency: payment.currency,
        keyId: this.razorpay.getKeyId(),
      });
    });
  }

  async verifyPayment(data: {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const payment = await this.prisma.payment.findUnique({
      where: { bookingId: data.bookingId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === "SUCCESS") {
      throw new ConflictException("Payment already processed");
    }

    const isValid = await this.razorpay.verifyPayment(
      data.razorpayOrderId,
      data.razorpayPaymentId,
      data.razorpaySignature,
    );
    if (!isValid) {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: "VERIFICATION_FAILED",
          status: "FAILED",
          payload: data as any,
        },
      });
      throw new BadRequestException("Invalid payment signature");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature,
          paidAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: data.bookingId },
        data: { status: "CONFIRMED" },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: "PAYMENT_CAPTURED",
          status: "SUCCESS",
          amountPaise: payment.amountPaise,
          payload: data as any,
        },
      });

      return updatedPayment;
    });

    return ApiResponseDto.success(result);
  }

  async handleWebhook(event: {
    event: string;
    payload: any;
  }): Promise<ApiResponseDto<any>> {
    const eventType = event.event;
    const contains =
      event.payload?.payment?.entity || event.payload?.order?.entity;
    const razorpayPaymentId = event.payload?.payment?.entity?.id;
    const razorpayOrderId =
      event.payload?.order?.entity?.id ||
      event.payload?.payment?.entity?.order_id;
    const amount = contains?.amount;

    // Idempotency: check if we've already processed this event
    const eventId =
      event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id;
    if (eventId) {
      const existingEvent = await this.prisma.paymentEvent.findFirst({
        where: { razorpayEventId: eventId },
      });
      if (existingEvent) {
        return ApiResponseDto.success({ status: "ALREADY_PROCESSED" });
      }
    }

    // Find payment by razorpayOrderId if available
    const payment = razorpayOrderId
      ? await this.prisma.payment.findUnique({ where: { razorpayOrderId } })
      : null;

    await this.prisma.paymentEvent.create({
      data: {
        paymentId: payment?.id,
        eventType:
          eventType.split(".").pop()?.toUpperCase() || "WEBHOOK_RECEIVED",
        razorpayEventId: eventId,
        status: "RECEIVED",
        amountPaise: amount,
        payload: event as any,
      },
    });

    if (eventType === "payment.captured" && payment) {
      if (payment.status !== "SUCCESS") {
        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment!.id },
            data: {
              status: "SUCCESS",
              razorpayPaymentId,
              paidAt: new Date(),
            },
          });

          if (payment!.bookingId) {
            await tx.booking.update({
              where: { id: payment!.bookingId },
              data: { status: "CONFIRMED" },
            });
          }
        });
      }
    }

    return ApiResponseDto.success({ status: "PROCESSED" });
  }

  async getPaymentById(id: string): Promise<ApiResponseDto<any>> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    return ApiResponseDto.success(payment);
  }

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

  async refundPayment(
    paymentId: string,
    amountPaise?: number,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (actorRole && !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new BadRequestException("Insufficient permissions");
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status !== "SUCCESS") {
      throw new BadRequestException("Payment cannot be refunded");
    }

    const refund = await this.razorpay.refund(
      payment.razorpayPaymentId!,
      amountPaise,
    );

    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
        refundAmountPaise: amountPaise || payment.amountPaise,
      },
    });

    await this.prisma.paymentEvent.create({
      data: {
        paymentId,
        eventType: "REFUNDED",
        status: "SUCCESS",
        amountPaise: amountPaise || payment.amountPaise,
        payload: refund as any,
      },
    });

    return ApiResponseDto.success(updated);
  }
}
