import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "./events.service";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

describe("EventsService", () => {
  let service: EventsService;
  let prisma: PrismaService;

  const mockEvent = {
    id: "event-1",
    templeId: "temple-1",
    title: "Navaratri Festival",
    description: "Nine nights festival",
    imageUrl: null,
    location: "Temple Hall",
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-09"),
    capacity: 100,
    registrationRequired: true,
    status: "PUBLISHED",
    bookedCount: 50,
    _count: { registrations: 50 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegistration = {
    id: "reg-1",
    eventId: "event-1",
    userId: "user-1",
    status: "REGISTERED",
    qrToken: "qr-event-123",
    registeredAt: new Date(),
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma: any = {
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    eventRegistration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    temple: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((arg: any) =>
      typeof arg === "function" ? arg(mockPrisma) : Promise.all(arg),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("list", () => {
    it("should return published events for temple with availability", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);

      const result = await service.list("temple-1");

      expect(result.data).toHaveLength(1);
      expect(result.data![0].registeredCount).toBe(50);
      expect(result.data![0].availableSpots).toBe(50);
      expect(result.data![0].isFull).toBe(false);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { templeId: "temple-1" },
        orderBy: { startDate: "asc" },
        include: { _count: { select: { registrations: true } } },
      });
    });

    it("should filter by status", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);

      const result = await service.list("temple-1", { status: "DRAFT" });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { templeId: "temple-1", status: "DRAFT" },
        orderBy: { startDate: "asc" },
        include: { _count: { select: { registrations: true } } },
      });
    });

    it("should filter upcoming events", async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent]);

      const result = await service.list("temple-1", { upcoming: true });

      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { templeId: "temple-1", startDate: { gte: expect.any(Date) } },
        orderBy: { startDate: "asc" },
        include: { _count: { select: { registrations: true } } },
      });
    });
  });

  describe("getById", () => {
    it("should return event by id with registrations", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        temple: { id: "temple-1", name: "Test Temple" },
        registrations: [mockRegistration],
      });

      const result = await service.getById("event-1");

      expect(result.data).toEqual({
        ...mockEvent,
        temple: { id: "temple-1", name: "Test Temple" },
        registrations: [mockRegistration],
      });
    });

    it("should throw if not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.getById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create event", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      mockPrisma.event.create.mockResolvedValue(mockEvent);

      const result = await service.create(
        "temple-1",
        {
          title: "Navaratri Festival",
          startDate: "2026-10-01",
          endDate: "2026-10-09",
          capacity: 100,
        },
        "ADMIN",
      );

      expect(result.data).toEqual(mockEvent);
    });

    it("should throw if temple not found", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          "invalid",
          {
            title: "Navaratri Festival",
            startDate: "2026-10-01",
            endDate: "2026-10-09",
          },
          "ADMIN",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if end date before start date", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });

      await expect(
        service.create(
          "temple-1",
          {
            title: "Navaratri Festival",
            startDate: "2026-10-09",
            endDate: "2026-10-01",
          },
          "ADMIN",
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.create(
          "temple-1",
          {
            title: "Navaratri Festival",
            startDate: "2026-10-01",
            endDate: "2026-10-09",
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("register", () => {
    it("should register user for event", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.eventRegistration.count.mockResolvedValue(50);
      mockPrisma.eventRegistration.create.mockResolvedValue(mockRegistration);
      mockPrisma.event.update.mockResolvedValue({
        ...mockEvent,
        bookedCount: 51,
      });

      const result = await service.register("user-1", "event-1");

      expect(result.data).toEqual(mockRegistration);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("should throw if event not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.register("user-1", "invalid")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw if event not published", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        status: "DRAFT",
      });

      await expect(service.register("user-1", "event-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw if registration not required", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        registrationRequired: false,
      });

      await expect(service.register("user-1", "event-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw if event is full", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.count.mockResolvedValue(100);

      await expect(service.register("user-1", "event-1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw if already registered", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(
        mockRegistration,
      );

      await expect(service.register("user-1", "event-1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should reactivate cancelled registration", async () => {
      const cancelledReg = { ...mockRegistration, status: "CANCELLED" };
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventRegistration.count.mockResolvedValue(50);
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(cancelledReg);
      mockPrisma.eventRegistration.update.mockResolvedValue({
        ...cancelledReg,
        status: "REGISTERED",
      });
      mockPrisma.event.update.mockResolvedValue({
        ...mockEvent,
        bookedCount: 51,
      });

      const result = await service.register("user-1", "event-1");

      expect(result.data.status).toBe("REGISTERED");
    });
  });

  describe("cancelRegistration", () => {
    it("should cancel registration", async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(
        mockRegistration,
      );
      mockPrisma.eventRegistration.update.mockResolvedValue({
        ...mockRegistration,
        status: "CANCELLED",
      });
      mockPrisma.event.update.mockResolvedValue({
        ...mockEvent,
        bookedCount: 49,
      });

      const result = await service.cancelRegistration("user-1", "event-1");

      expect(result.data.message).toBe("Registration cancelled");
    });

    it("should throw if registration not found", async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelRegistration("user-1", "event-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if already cancelled", async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: "CANCELLED",
      });

      await expect(
        service.cancelRegistration("user-1", "event-1"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getMyRegistrations", () => {
    it("should return user registrations", async () => {
      mockPrisma.eventRegistration.findMany.mockResolvedValue([
        mockRegistration,
      ]);
      mockPrisma.eventRegistration.count.mockResolvedValue(1);

      const result = await service.getMyRegistrations("user-1", {
        page: 1,
        limit: 20,
      });

      expect(result.data.registrations).toEqual([mockRegistration]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("getEventRegistrations", () => {
    it("should return event registrations", async () => {
      mockPrisma.eventRegistration.findMany.mockResolvedValue([
        mockRegistration,
      ]);
      mockPrisma.eventRegistration.count.mockResolvedValue(1);

      const result = await service.getEventRegistrations("event-1", {
        page: 1,
        limit: 50,
      });

      expect(result.data.registrations).toEqual([mockRegistration]);
      expect(result.data.total).toBe(1);
    });
  });

  describe("verifyQrToken", () => {
    it("should verify valid QR token", async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue({
        ...mockRegistration,
        event: {
          id: "event-1",
          title: "Navaratri Festival",
          startDate: new Date(),
          endDate: new Date(),
          location: "Temple Hall",
        },
        user: { id: "user-1", name: "Test User", phone: "+919876543210" },
      });

      const result = await service.verifyQrToken("qr-event-123");

      expect(result.data).toEqual({
        registrationId: "reg-1",
        event: {
          id: "event-1",
          title: "Navaratri Festival",
          startDate: expect.any(Date),
          endDate: expect.any(Date),
          location: "Temple Hall",
        },
        user: { id: "user-1", name: "Test User", phone: "+919876543210" },
        registeredAt: expect.any(Date),
      });
    });

    it("should return error for invalid QR", async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue(null);

      const result = await service.verifyQrToken("invalid");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_QR");
    });

    it("should return error for non-registered status", async () => {
      mockPrisma.eventRegistration.findUnique.mockResolvedValue({
        ...mockRegistration,
        status: "CANCELLED",
      });

      const result = await service.verifyQrToken("qr-event-123");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_STATUS");
    });
  });

  describe("update", () => {
    it("should update event", async () => {
      mockPrisma.event.update.mockResolvedValue({
        ...mockEvent,
        title: "Updated Event",
      });

      const result = await service.update(
        "event-1",
        { title: "Updated Event" },
        "ADMIN",
      );

      expect(result.data.title).toBe("Updated Event");
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.update("event-1", { title: "Updated" }, "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("delete", () => {
    it("should delete event", async () => {
      mockPrisma.event.delete.mockResolvedValue({});

      const result = await service.delete("event-1", "ADMIN");

      expect(result.data!.message).toBe("Event deleted");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(service.delete("event-1", "MANAGER")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
