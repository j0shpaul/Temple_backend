import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { CashfreeService } from "../payments/cashfree.service";
import { MahaprasadService } from "./mahaprasad.service";
import { NotFoundException, ConflictException } from "@nestjs/common";

describe("MahaprasadService", () => {
  let service: MahaprasadService;
  let prisma: PrismaService;
  let cashfree: CashfreeService;

  const mockSlot = {
    id: "slot-1",
    templeId: "temple-1",
    sessionName: "Madhyahna Mahaprasad (Lunch)",
    date: new Date(),
    startTime: "12:00 PM",
    endTime: "02:00 PM",
    capacity: 10,
    bookedCount: 0,
    pricePerPersonPaise: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBooking = {
    id: "mp-book-1",
    userId: "user-1",
    slotId: "slot-1",
    numberOfPeople: 2,
    devoteeName: "Ramesh Sharma",
    devoteePhone: "+919876543210",
    reference: "MP123456",
    status: "CONFIRMED",
    paymentId: null,
    qrToken: "qr-123",
    checkedInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    slot: mockSlot,
  };

  const mockPrisma: any = {
    mahaprasadSlot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    mahaprasadBooking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    temple: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const mockCashfreeService = {
    createOrder: jest.fn().mockResolvedValue({
      id: "cf_order_1",
      orderId: "cf_order_1",
      paymentSessionId: "session_123",
      amount: 10000,
      currency: "INR",
      status: "ACTIVE",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MahaprasadService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CashfreeService, useValue: mockCashfreeService },
      ],
    }).compile();

    service = module.get<MahaprasadService>(MahaprasadService);
    prisma = module.get<PrismaService>(PrismaService);
    cashfree = module.get<CashfreeService>(CashfreeService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listSlots", () => {
    it("should return enriched slots with availableCapacity", async () => {
      mockPrisma.mahaprasadSlot.findMany.mockResolvedValue([mockSlot]);

      const result = await service.listSlots({});
      expect(result.data![0].availableCapacity).toBe(10);
      expect(result.data![0].isFull).toBe(false);
    });
  });

  describe("bookSlot - Capacity Safety", () => {
    it("should successfully book when capacity is available", async () => {
      mockPrisma.mahaprasadSlot.findUnique.mockResolvedValue(mockSlot);
      mockPrisma.mahaprasadSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.mahaprasadBooking.create.mockResolvedValue(mockBooking);

      const result = await service.bookSlot({
        slotId: "slot-1",
        numberOfPeople: 2,
        devoteeName: "Ramesh Sharma",
        devoteePhone: "+919876543210",
      });

      expect(result.data!.booking.reference).toBe("MP123456");
      expect(mockPrisma.mahaprasadSlot.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "slot-1",
            isActive: true,
            bookedCount: { lte: 8 }, // 10 - 2
          }),
        }),
      );
    });

    it("should throw ConflictException if capacity exceeded (User A books 6, User B tries 5 on capacity 10)", async () => {
      // Slot capacity 10, already booked 6 (remaining 4)
      const partiallyBookedSlot = { ...mockSlot, bookedCount: 6 };
      mockPrisma.mahaprasadSlot.findUnique.mockResolvedValue(partiallyBookedSlot);
      // Atomic update fails (0 rows updated)
      mockPrisma.mahaprasadSlot.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.bookSlot({
          slotId: "slot-1",
          numberOfPeople: 5, // 6 + 5 = 11 > 10
          devoteeName: "Suresh Gupta",
          devoteePhone: "+919876543211",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should create Cashfree order if slot is paid", async () => {
      const paidSlot = { ...mockSlot, pricePerPersonPaise: 5000 }; // Rs 50/person
      mockPrisma.mahaprasadSlot.findUnique.mockResolvedValue(paidSlot);
      mockPrisma.mahaprasadSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.mahaprasadBooking.create.mockResolvedValue({
        ...mockBooking,
        status: "PENDING_PAYMENT",
      });
      mockPrisma.payment.create.mockResolvedValue({
        id: "pay-1",
        amountPaise: 10000,
        status: "PENDING",
      });

      const result = await service.bookSlot({
        slotId: "slot-1",
        numberOfPeople: 2,
        devoteeName: "Ramesh Sharma",
        devoteePhone: "+919876543210",
      });

      expect(result.data!.payment).toBeDefined();
      expect(result.data!.payment.amountPaise).toBe(10000);
      expect(mockCashfreeService.createOrder).toHaveBeenCalled();
    });
  });
});
