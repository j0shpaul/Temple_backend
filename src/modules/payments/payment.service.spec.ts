import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentService } from "./payment.service";
import { CashfreeService } from "./cashfree.service";
import { PaymentStatus } from "@prisma/client";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

describe("PaymentService", () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let cashfreeService: CashfreeService;

  const mockBooking = {
    id: "booking-1",
    userId: "user-1",
    templeId: "temple-1",
    bookingType: "PUJA",
    status: "PENDING_PAYMENT",
    amountPaise: 50000,
    reference: "BK-TMP-PUJA-123456",
    slotId: "puja-slot-1",
    devoteeName: "Devotee One",
    devoteePhone: "+919999999999",
    user: { id: "user-1", name: "Devotee One", phone: "+919999999999" },
  };

  const mockPayment = {
    id: "payment-1",
    bookingId: "booking-1",
    entityType: "PUJA_BOOKING",
    userId: "user-1",
    amountPaise: 50000,
    currency: "INR",
    status: PaymentStatus.PENDING,
    gateway: "CASHFREE",
    razorpayOrderId: "BK_BK-TMP-PUJA-123456_ORDER",
    description: "Booking payment: BK-TMP-PUJA-123456",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma: any = {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    donation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    donationReceipt: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    prasadOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    prasadProduct: {
      update: jest.fn(),
    },
    accommodationBooking: {
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockCashfreeService = {
    createOrder: jest.fn(),
    fetchOrderStatus: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    refund: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CashfreeService, useValue: mockCashfreeService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    cashfreeService = module.get<CashfreeService>(CashfreeService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createPaymentForBooking", () => {
    it("should create payment and Cashfree order", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockCashfreeService.createOrder.mockResolvedValue({
        id: "order_123",
        orderId: "order_123",
        paymentSessionId: "session_123",
        amount: 50000,
        currency: "INR",
        status: "ACTIVE",
      });
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      const result = await service.createPaymentForBooking(
        "booking-1",
        "user-1",
      );

      expect(result.data).toEqual(
        expect.objectContaining({
          paymentId: "payment-1",
          orderId: "order_123",
          paymentSessionId: "session_123",
          amountPaise: 50000,
          currency: "INR",
          gateway: "CASHFREE",
        }),
      );
      expect(mockCashfreeService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000,
          currency: "INR",
        }),
      );
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw if booking not found", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentForBooking("invalid", "user-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if booking does not belong to user", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        userId: "user-2",
      });

      await expect(
        service.createPaymentForBooking("booking-1", "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw if booking already confirmed", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "CONFIRMED",
      });

      await expect(
        service.createPaymentForBooking("booking-1", "user-1"),
      ).rejects.toThrow(ConflictException);
    });

    it("should return existing pending payment if already created", async () => {
      const existingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await service.createPaymentForBooking(
        "booking-1",
        "user-1",
      );

      expect(result.data.paymentId).toBe("payment-1");
      expect(mockCashfreeService.createOrder).not.toHaveBeenCalled();
    });
  });

  describe("reconcilePayment (Server-Authoritative Recovery)", () => {
    it("should query Cashfree and transition to SUCCESS if paid on gateway", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);
      mockCashfreeService.fetchOrderStatus.mockResolvedValue({
        orderStatus: "PAID",
        amount: 50000,
        payments: [{ id: "cf_pay_1", status: "SUCCESS", amount: 50000 }],
      });
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: "CONFIRMED",
      });

      const result = await service.reconcilePayment("payment-1", "user-1");

      expect(result.data.status).toBe("SUCCESS");
      expect(mockPrisma.booking.update).toHaveBeenCalled();
    });

    it("should return current status if already SUCCESS", async () => {
      const successPayment = { ...mockPayment, status: PaymentStatus.SUCCESS };
      mockPrisma.payment.findFirst.mockResolvedValue(successPayment);

      const result = await service.reconcilePayment("payment-1", "user-1");

      expect(result.data.status).toBe("SUCCESS");
      expect(mockCashfreeService.fetchOrderStatus).not.toHaveBeenCalled();
    });

    it("should prevent unauthorized user from checking another devotee's payment", async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(mockPayment);

      await expect(
        service.reconcilePayment("payment-1", "other-user", "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("handleWebhook", () => {
    it("should process valid Cashfree webhook idempotently", async () => {
      mockCashfreeService.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.paymentEvent.findFirst.mockResolvedValue(null);
      mockPrisma.paymentEvent.create.mockResolvedValue({});
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: "CONFIRMED",
      });

      const result = await service.handleWebhook(
        {
          type: "PAYMENT_SUCCESS_WEBHOOK",
          data: {
            order: { order_id: "BK_BK-TMP-PUJA-123456_ORDER" },
            payment: {
              cf_payment_id: "cf_123",
              payment_status: "SUCCESS",
              payment_amount: 500.0,
            },
          },
        },
        { "x-webhook-signature": "valid_signature" },
      );

      expect(result.data.status).toBe("PROCESSED");
      expect(result.data.state).toBe("SUCCESS");
      expect(mockPrisma.paymentEvent.create).toHaveBeenCalled();
    });

    it("should reject webhook with invalid signature", async () => {
      mockCashfreeService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(
          { type: "PAYMENT_SUCCESS_WEBHOOK" },
          { "x-webhook-signature": "bad_sig" },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should safely ignore duplicate webhook (idempotency)", async () => {
      mockCashfreeService.verifyWebhookSignature.mockReturnValue(true);
      mockPrisma.paymentEvent.findFirst.mockResolvedValue({ id: "event-1" });

      const result = await service.handleWebhook(
        {
          event_id: "event-1",
          type: "PAYMENT_SUCCESS_WEBHOOK",
          data: { payment: { cf_payment_id: "cf_123" } },
        },
        { "x-webhook-signature": "valid_signature" },
      );

      expect(result.data.status).toBe("ALREADY_PROCESSED");
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe("refundPayment", () => {
    it("should refund payment for admin", async () => {
      const successPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      };
      mockPrisma.payment.findUnique.mockResolvedValue(successPayment);
      mockCashfreeService.refund.mockResolvedValue({ id: "refund_123" } as any);
      mockPrisma.payment.update.mockResolvedValue({
        ...successPayment,
        status: PaymentStatus.REFUNDED,
      });
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      const result = await service.refundPayment(
        "payment-1",
        undefined,
        "ADMIN",
      );

      expect(result.data.status).toBe(PaymentStatus.REFUNDED);
    });

    it("should throw ForbiddenException for devotee attempting refund", async () => {
      await expect(
        service.refundPayment("payment-1", undefined, "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
