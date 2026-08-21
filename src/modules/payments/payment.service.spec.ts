import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PaymentService } from "./payment.service";
import { RazorpayService } from "./razorpay.service";
import { PaymentStatus } from "@prisma/client";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

describe("PaymentService", () => {
  let service: PaymentService;
  let prisma: PrismaService;
  let razorpayService: RazorpayService;

  const mockBooking = {
    id: "booking-1",
    userId: "user-1",
    templeId: "temple-1",
    bookingType: "PUJA",
    status: "PENDING_PAYMENT",
    paymentStatus: "PENDING",
    amountPaise: 50000,
    reference: "BK-TMP-PUJA-123456",
    slotId: "puja-slot-1",
  };

  const mockPayment = {
    id: "payment-1",
    bookingId: "booking-1",
    entityType: "PUJA_BOOKING",
    userId: "user-1",
    amountPaise: 50000,
    currency: "INR",
    status: PaymentStatus.PENDING,
    razorpayOrderId: "order_123",
    description: "Booking payment: BK-TMP-PUJA-123456",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma: any = {
    payment: {
      findUnique: jest.fn(),
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
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockRazorpayService = {
    createOrder: jest.fn(),
    verifyPayment: jest.fn(),
    refund: jest.fn(),
    getKeyId: jest.fn().mockReturnValue("rzp_test_key"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    razorpayService = module.get<RazorpayService>(RazorpayService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createPaymentForBooking", () => {
    it("should create payment and Razorpay order", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockRazorpayService.createOrder.mockResolvedValue({
        id: "order_123",
        amount: 50000,
        currency: "INR",
      });
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      const result = await service.createPaymentForBooking(
        "booking-1",
        "user-1",
      );

      expect(result.data).toEqual({
        paymentId: "payment-1",
        razorpayOrderId: "order_123",
        amountPaise: 50000,
        currency: "INR",
        keyId: "rzp_test_key",
      });
      expect(mockRazorpayService.createOrder).toHaveBeenCalledWith(
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

    it("should throw if booking has no payment required", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        amountPaise: 0,
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

    it("should return existing payment if not failed", async () => {
      const existingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);

      const result = await service.createPaymentForBooking(
        "booking-1",
        "user-1",
      );

      expect(result.data.paymentId).toBe("payment-1");
      expect(mockRazorpayService.createOrder).not.toHaveBeenCalled();
    });
  });

  describe("verifyPayment", () => {
    it("should verify payment and update booking", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockRazorpayService.verifyPayment.mockResolvedValue(true);
      mockPrisma.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        status: "CONFIRMED",
      });
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      const result = await service.verifyPayment({
        bookingId: "booking-1",
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      });

      expect(result.data.status).toBe(PaymentStatus.SUCCESS);
      expect(mockRazorpayService.verifyPayment).toHaveBeenCalledWith(
        "order_123",
        "pay_123",
        "sig_123",
      );
    });

    it("should throw if signature invalid", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockRazorpayService.verifyPayment.mockResolvedValue(false);
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      await expect(
        service.verifyPayment({
          bookingId: "booking-1",
          razorpayOrderId: "order_123",
          razorpayPaymentId: "pay_123",
          razorpaySignature: "invalid",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw if payment already processed", async () => {
      const successPayment = { ...mockPayment, status: PaymentStatus.SUCCESS };
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue(successPayment);

      await expect(
        service.verifyPayment({
          bookingId: "booking-1",
          razorpayOrderId: "order_123",
          razorpayPaymentId: "pay_123",
          razorpaySignature: "sig_123",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("handleWebhook", () => {
    it("should process webhook idempotently", async () => {
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

      const result = await service.handleWebhook({
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_123",
              amount: 50000,
            },
          },
        },
      });

      expect(result.data.status).toBe("PROCESSED");
      expect(mockPrisma.paymentEvent.create).toHaveBeenCalled();
    });

    it("should skip duplicate webhook", async () => {
      mockPrisma.paymentEvent.findFirst.mockResolvedValue({ id: "event-1" });

      const result = await service.handleWebhook({
        event: "payment.captured",
        payload: {
          payment: {
            entity: { id: "pay_123" },
          },
        },
      });

      expect(result.data.status).toBe("ALREADY_PROCESSED");
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });

  describe("getPaymentById", () => {
    it("should return payment by id", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById("payment-1");

      expect(result.data).toEqual(mockPayment);
    });

    it("should throw if not found", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPaymentById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getUserPayments", () => {
    it("should return paginated payments for user", async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.payment.count.mockResolvedValue(1);

      const result = await service.getUserPayments("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data.payments).toEqual([mockPayment]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("refundPayment", () => {
    it("should refund payment", async () => {
      const successPayment = {
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
        razorpayPaymentId: "pay_123",
      };
      mockPrisma.payment.findUnique.mockResolvedValue(successPayment);
      mockRazorpayService.refund.mockResolvedValue({ id: "refund_123" });
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

    it("should throw if payment not success", async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      await expect(
        service.refundPayment("payment-1", undefined, "ADMIN"),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      const successPayment = { ...mockPayment, status: PaymentStatus.SUCCESS };
      mockPrisma.payment.findUnique.mockResolvedValue(successPayment);

      await expect(
        service.refundPayment("payment-1", undefined, "DEVOTEE"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
