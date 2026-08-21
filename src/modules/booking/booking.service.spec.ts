import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "./booking.service";
import { BookingStatus, PaymentStatus } from "@prisma/client";
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";

describe("BookingService", () => {
  let service: BookingService;
  let prisma: PrismaService;

  const mockPuja = {
    id: "puja-1",
    templeId: "temple-1",
    deityId: "deity-1",
    name: "Test Puja",
    description: "Test puja",
    pricePaise: 50000,
    durationMinutes: 30,
    defaultCapacity: 10,
    isActive: true,
    status: "ACTIVE",
  };

  const mockSeva = {
    id: "seva-1",
    templeId: "temple-1",
    deityId: "deity-1",
    name: "Test Seva",
    description: "Test seva",
    pricePaise: 100000,
    durationMinutes: 60,
    defaultCapacity: 5,
    isActive: true,
    status: "ACTIVE",
  };

  const mockDarshanSchedule = {
    id: "schedule-1",
    templeId: "temple-1",
    name: "Morning Darshan",
    startTime: "06:00",
    endTime: "07:00",
    status: "ACTIVE",
  };

  const mockDarshanSlot = {
    id: "slot-1",
    scheduleId: "schedule-1",
    date: new Date("2026-08-20"),
    startTime: "06:00",
    endTime: "07:00",
    capacity: 50,
    bookedCount: 0,
    isActive: true,
    status: "ACTIVE",
    schedule: mockDarshanSchedule,
  };

  const mockPujaSlot = {
    id: "puja-slot-1",
    pujaId: "puja-1",
    date: new Date("2026-08-20"),
    startTime: "08:00",
    endTime: "08:30",
    capacity: 10,
    bookedCount: 0,
    isActive: true,
    status: "ACTIVE",
    puja: mockPuja,
  };

  const mockSevaSlot = {
    id: "seva-slot-1",
    sevaId: "seva-1",
    date: new Date("2026-08-20"),
    startTime: "08:00",
    endTime: "09:00",
    capacity: 5,
    bookedCount: 0,
    isActive: true,
    status: "ACTIVE",
    seva: mockSeva,
  };

  const mockBooking = {
    id: "booking-1",
    userId: "user-1",
    templeId: "temple-1",
    bookingType: "PUJA",
    status: BookingStatus.PENDING_PAYMENT,
    paymentStatus: PaymentStatus.PENDING,
    amountPaise: 50000,
    quantity: 1,
    slotDate: new Date("2026-08-20"),
    slotStartTime: "08:00",
    slotEndTime: "08:30",
    reference: "BK-TMP-PUJA-123456",
    qrToken: "qr-token-123",
    slotId: "puja-slot-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    attendees: [],
  };

  const mockPrisma: any = {
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    pujaSlot: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    sevaSlot: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    darshanSlot: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    puja: {
      findUnique: jest.fn(),
    },
    seva: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    checkIn: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createPujaBooking", () => {
    it("should create puja booking with atomic transaction", async () => {
      mockPrisma.puja.findUnique.mockResolvedValue(mockPuja);
      mockPrisma.pujaSlot.findUnique.mockResolvedValue(mockPujaSlot);
      mockPrisma.pujaSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.create.mockResolvedValue(mockBooking);

      const result = await service.createPujaBooking("user-1", {
        templeId: "temple-1",
        pujaId: "puja-1",
        slotId: "puja-slot-1",
        quantity: 1,
        devoteeName: "Test Devotee",
        devoteePhone: "+919876543210",
      });

      expect(result.data).toEqual(mockBooking);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.pujaSlot.updateMany).toHaveBeenCalled();
    });

    it("should throw if slot not found", async () => {
      mockPrisma.pujaSlot.findUnique.mockResolvedValue(null);

      await expect(
        service.createPujaBooking("user-1", {
          templeId: "temple-1",
          pujaId: "invalid-puja",
          slotId: "invalid-slot",
          quantity: 1,
          devoteeName: "Test Devotee",
          devoteePhone: "+919876543210",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if slot is fully booked", async () => {
      const fullSlot = { ...mockPujaSlot, bookedCount: 10, capacity: 10 };
      mockPrisma.puja.findUnique.mockResolvedValue(mockPuja);
      mockPrisma.pujaSlot.findUnique.mockResolvedValue(fullSlot);
      mockPrisma.pujaSlot.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.createPujaBooking("user-1", {
          templeId: "temple-1",
          pujaId: "puja-1",
          slotId: "puja-slot-1",
          quantity: 1,
          devoteeName: "Test Devotee",
          devoteePhone: "+919876543210",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("createSevaBooking", () => {
    it("should create seva booking with atomic transaction", async () => {
      mockPrisma.seva.findUnique.mockResolvedValue(mockSeva);
      mockPrisma.sevaSlot.findUnique.mockResolvedValue(mockSevaSlot);
      mockPrisma.sevaSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.create.mockResolvedValue({
        ...mockBooking,
        bookingType: "SEVA",
        slotId: "seva-slot-1",
      });

      const result = await service.createSevaBooking("user-1", {
        templeId: "temple-1",
        sevaId: "seva-1",
        slotId: "seva-slot-1",
        quantity: 1,
        devoteeName: "Test Devotee",
        devoteePhone: "+919876543210",
      });

      expect(result.data.bookingType).toBe("SEVA");
      expect(mockPrisma.sevaSlot.updateMany).toHaveBeenCalled();
    });
  });

  describe("createDarshanBooking", () => {
    it("should create darshan booking", async () => {
      mockPrisma.darshanSlot.findUnique.mockResolvedValue(mockDarshanSlot);
      mockPrisma.darshanSlot.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.create.mockResolvedValue({
        ...mockBooking,
        bookingType: "DARSHAN",
        slotId: "slot-1",
        amountPaise: 0,
      });

      const result = await service.createDarshanBooking("user-1", {
        templeId: "temple-1",
        scheduleId: "schedule-1",
        slotId: "slot-1",
        quantity: 2,
        devoteeName: "Test Devotee",
        devoteePhone: "+919876543210",
      });

      expect(result.data.bookingType).toBe("DARSHAN");
      expect(mockPrisma.darshanSlot.updateMany).toHaveBeenCalled();
    });
  });

  describe("cancelBooking", () => {
    it("should cancel booking and decrement slot count", async () => {
      const pendingBooking = {
        ...mockBooking,
        status: BookingStatus.PENDING_PAYMENT,
      };
      mockPrisma.booking.findUnique.mockResolvedValue(pendingBooking);
      mockPrisma.booking.update.mockResolvedValue({
        ...pendingBooking,
        status: BookingStatus.CANCELLED,
      });

      const result = await service.cancelBooking(
        "booking-1",
        "user-1",
        "User cancelled",
        "DEVOTEE",
      );

      expect(result.data.status).toBe(BookingStatus.CANCELLED);
      expect(mockPrisma.pujaSlot.update).toHaveBeenCalledWith({
        where: { id: "puja-slot-1" },
        data: { bookedCount: { decrement: 1 } },
      });
    });

    it("should throw if booking not found", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelBooking("invalid-id", "user-1", "reason", "DEVOTEE"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if booking already cancelled", async () => {
      const cancelledBooking = {
        ...mockBooking,
        status: BookingStatus.CANCELLED,
      };
      mockPrisma.booking.findUnique.mockResolvedValue(cancelledBooking);

      await expect(
        service.cancelBooking("booking-1", "user-1", "reason", "DEVOTEE"),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw if unauthorized", async () => {
      const otherUserBooking = { ...mockBooking, userId: "user-2" };
      mockPrisma.booking.findUnique.mockResolvedValue(otherUserBooking);

      await expect(
        service.cancelBooking("booking-1", "user-1", "reason", "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("markCheckedIn", () => {
    it("should check in booking", async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.SUCCESS,
      };
      mockPrisma.booking.findUnique.mockResolvedValue(confirmedBooking);
      mockPrisma.booking.update.mockResolvedValue({
        ...confirmedBooking,
        status: BookingStatus.CHECKED_IN,
        checkedInAt: new Date(),
      });
      mockPrisma.checkIn.create.mockResolvedValue({});

      const result = await service.markCheckedIn(
        "booking-1",
        "temple-1",
        "staff-1",
      );

      expect(result.data.status).toBe(BookingStatus.CHECKED_IN);
    });

    it("should throw if booking does not belong to temple", async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        templeId: "other-temple",
      };
      mockPrisma.booking.findUnique.mockResolvedValue(confirmedBooking);

      await expect(
        service.markCheckedIn("booking-1", "temple-1", "staff-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("verifyQrToken", () => {
    it("should verify valid QR token", async () => {
      const confirmedBooking = {
        ...mockBooking,
        status: BookingStatus.CONFIRMED,
        temple: { id: "temple-1", name: "Temple" },
        user: { id: "user-1", name: "User", phone: "+919876543210" },
      };
      mockPrisma.booking.findUnique.mockResolvedValue(confirmedBooking);

      const result = await service.verifyQrToken("qr-token-123");

      expect(result.success).toBe(true);
      expect(result.data.bookingId).toBe("booking-1");
    });

    it("should return error for invalid QR token", async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const result = await service.verifyQrToken("invalid-token");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_QR");
    });
  });
});
