import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { AccommodationService } from "./accommodation.service";
import { RazorpayService } from "../payments/razorpay.service";
import { AccommodationStatus } from "@prisma/client";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

describe("AccommodationService", () => {
  let service: AccommodationService;
  let prisma: PrismaService;
  let razorpay: RazorpayService;

  const mockRoom = {
    id: "room-1",
    templeId: "temple-1",
    roomNumber: "A-101",
    type: "DELUXE",
    capacity: 4,
    pricePaise: 500000,
    amenities: ["AC", "WiFi", "TV"],
    description: "Comfortable deluxe room",
    floor: 1,
    status: "AVAILABLE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBooking = {
    id: "booking-1",
    userId: "user-1",
    templeId: "temple-1",
    roomId: "room-1",
    checkIn: new Date("2026-08-20"),
    checkOut: new Date("2026-08-22"),
    guests: 2,
    amountPaise: 1000000,
    status: "PENDING_PAYMENT",
    reference: "ACC-TMP-123456",
    qrToken: "qr-token-123",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    room: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    accommodationBooking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
    },
    temple: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((fn) => fn(mockPrisma)),
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
        AccommodationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpayService },
      ],
    }).compile();

    service = module.get<AccommodationService>(AccommodationService);
    prisma = module.get<PrismaService>(PrismaService);
    razorpay = module.get<RazorpayService>(RazorpayService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listRooms", () => {
    it("should return all rooms for temple", async () => {
      mockPrisma.room.findMany.mockResolvedValue([mockRoom]);

      const result = await service.listRooms("temple-1");

      expect(result.data).toEqual([mockRoom]);
      expect(mockPrisma.room.findMany).toHaveBeenCalledWith({
        where: { templeId: "temple-1" },
        orderBy: { roomNumber: "asc" },
      });
    });
  });

  describe("getRoom", () => {
    it("should return room by id", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);

      const result = await service.getRoom("room-1");

      expect(result.data).toEqual(mockRoom);
    });

    it("should throw if not found", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.getRoom("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createRoom", () => {
    it("should create room", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      mockPrisma.room.create.mockResolvedValue(mockRoom);

      const result = await service.createRoom(
        "temple-1",
        {
          roomNumber: "A-101",
          type: "DELUXE",
          capacity: 4,
          pricePaise: 500000,
        },
        "ADMIN",
      );

      expect(result.data).toEqual(mockRoom);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.createRoom(
          "temple-1",
          {
            roomNumber: "A-101",
            type: "DELUXE",
            capacity: 4,
            pricePaise: 500000,
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getAvailability", () => {
    it("should return available rooms for date range", async () => {
      mockPrisma.room.findMany.mockResolvedValue([
        { ...mockRoom, bookings: [] },
      ]);

      const result = await service.getAvailability(
        "temple-1",
        "2026-08-20",
        "2026-08-22",
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].roomNumber).toBe("A-101");
      expect(result.data[0].totalNights).toBe(2);
    });

    it("should throw if check-out before check-in", async () => {
      await expect(
        service.getAvailability("temple-1", "2026-08-22", "2026-08-20"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createBooking", () => {
    it("should create booking with overlap check", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.accommodationBooking.findFirst.mockResolvedValue(null);
      mockPrisma.accommodationBooking.create.mockResolvedValue(mockBooking);
      mockRazorpayService.createOrder.mockResolvedValue({ id: "order_123" });
      mockPrisma.payment.create.mockResolvedValue({});

      const result = await service.createBooking("user-1", {
        templeId: "temple-1",
        roomId: "room-1",
        checkIn: "2026-08-20",
        checkOut: "2026-08-22",
        guests: 2,
      });

      expect(result.data.booking).toEqual(mockBooking);
      expect(result.data.razorpayOrderId).toBe("order_123");
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw if room not found", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(
        service.createBooking("user-1", {
          templeId: "temple-1",
          roomId: "invalid",
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          guests: 2,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if room not available", async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        ...mockRoom,
        status: "MAINTENANCE",
      });

      await expect(
        service.createBooking("user-1", {
          templeId: "temple-1",
          roomId: "room-1",
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          guests: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw if guests exceed capacity", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);

      await expect(
        service.createBooking("user-1", {
          templeId: "temple-1",
          roomId: "room-1",
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          guests: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw if overlapping booking exists", async () => {
      mockPrisma.room.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.accommodationBooking.findFirst.mockResolvedValue(mockBooking);

      await expect(
        service.createBooking("user-1", {
          templeId: "temple-1",
          roomId: "room-1",
          checkIn: "2026-08-20",
          checkOut: "2026-08-22",
          guests: 2,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("verifyBookingPayment", () => {
    it("should verify payment and confirm booking", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: "payment-1",
        accommodationId: "booking-1",
        status: "PENDING",
      });
      mockRazorpayService.verifyPayment.mockResolvedValue(true);
      mockPrisma.payment.update.mockResolvedValue({ status: "SUCCESS" });
      mockPrisma.accommodationBooking.update.mockResolvedValue({
        ...mockBooking,
        status: "CONFIRMED",
      });
      mockPrisma.paymentEvent.create.mockResolvedValue({});

      const result = await service.verifyBookingPayment({
        bookingId: "booking-1",
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      });

      expect(result.data.status).toBe("CONFIRMED");
    });
  });

  describe("getBookingById", () => {
    it("should return booking by id", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.getBookingById("booking-1");

      expect(result.data).toEqual(mockBooking);
    });

    it("should throw if not found", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(null);

      await expect(service.getBookingById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getUserBookings", () => {
    it("should return paginated bookings for user", async () => {
      mockPrisma.accommodationBooking.findMany.mockResolvedValue([mockBooking]);
      mockPrisma.accommodationBooking.count.mockResolvedValue(1);

      const result = await service.getUserBookings("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data.bookings).toEqual([mockBooking]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("getTempleBookings", () => {
    it("should return paginated bookings for temple", async () => {
      mockPrisma.accommodationBooking.findMany.mockResolvedValue([mockBooking]);
      mockPrisma.accommodationBooking.count.mockResolvedValue(1);

      const result = await service.getTempleBookings("temple-1", {
        page: 1,
        limit: 50,
      });

      expect(result.data.bookings).toEqual([mockBooking]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("checkIn", () => {
    it("should check in booking", async () => {
      const confirmedBooking = { ...mockBooking, status: "CONFIRMED" };
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(
        confirmedBooking,
      );
      mockPrisma.accommodationBooking.update.mockResolvedValue({
        ...confirmedBooking,
        status: "CHECKED_IN",
        checkedInAt: new Date(),
      });

      const result = await service.checkIn("booking-1", "temple-1", "staff-1");

      expect(result.data.status).toBe("CHECKED_IN");
    });

    it("should throw if booking not found", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(null);

      await expect(
        service.checkIn("invalid", "temple-1", "staff-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if booking does not belong to temple", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        templeId: "temple-2",
      });

      await expect(
        service.checkIn("booking-1", "temple-1", "staff-1"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw if booking not confirmed", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(mockBooking);

      await expect(
        service.checkIn("booking-1", "temple-1", "staff-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("checkOut", () => {
    it("should check out booking", async () => {
      const checkedInBooking = { ...mockBooking, status: "CHECKED_IN" };
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(
        checkedInBooking,
      );
      mockPrisma.accommodationBooking.update.mockResolvedValue({
        ...checkedInBooking,
        status: "COMPLETED",
        checkedOutAt: new Date(),
      });

      const result = await service.checkOut("booking-1", "temple-1");

      expect(result.data.status).toBe("COMPLETED");
    });
  });

  describe("cancelBooking", () => {
    it("should cancel booking", async () => {
      const confirmedBooking = { ...mockBooking, status: "CONFIRMED" };
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue(
        confirmedBooking,
      );
      mockPrisma.accommodationBooking.update.mockResolvedValue({
        ...confirmedBooking,
        status: "CANCELLED",
      });

      const result = await service.cancelBooking(
        "booking-1",
        "user-1",
        "DEVOTEE",
      );

      expect(result.data.status).toBe("CANCELLED");
    });

    it("should throw ForbiddenException if not owner and not staff", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        userId: "user-2",
      });

      await expect(
        service.cancelBooking("booking-1", "user-1", "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw if booking already cancelled", async () => {
      mockPrisma.accommodationBooking.findUnique.mockResolvedValue({
        ...mockBooking,
        status: "CANCELLED",
      });

      await expect(
        service.cancelBooking("booking-1", "user-1", "DEVOTEE"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateRoom", () => {
    it("should update room", async () => {
      mockPrisma.room.update.mockResolvedValue({
        ...mockRoom,
        pricePaise: 600000,
      });

      const result = await service.updateRoom(
        "room-1",
        { pricePaise: 600000 },
        "ADMIN",
      );

      expect(result.data.pricePaise).toBe(600000);
    });
  });

  describe("deleteRoom", () => {
    it("should delete room", async () => {
      mockPrisma.room.delete.mockResolvedValue({});

      const result = await service.deleteRoom("room-1", "ADMIN");

      expect(result.data?.message).toBe("Room deleted");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(service.deleteRoom("room-1", "MANAGER")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
