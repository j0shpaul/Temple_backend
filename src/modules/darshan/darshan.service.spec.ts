import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { DarshanService } from "./darshan.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("DarshanService", () => {
  let service: DarshanService;
  let prisma: PrismaService;

  const mockSchedule = {
    id: "schedule-1",
    templeId: "temple-1",
    name: "Morning Darshan",
    description: "Morning darshan schedule",
    dayOfWeek: null,
    specificDate: null,
    startTime: "06:00",
    endTime: "12:00",
    maxCapacity: 50,
    isSpecial: false,
    displayOrder: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSlot = {
    id: "slot-1",
    scheduleId: "schedule-1",
    date: new Date("2026-08-20"),
    startTime: new Date("2026-08-20T06:00:00"),
    endTime: new Date("2026-08-20T06:30:00"),
    capacity: 50,
    bookedCount: 10,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    darshanSchedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    darshanSlot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    temple: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DarshanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DarshanService>(DarshanService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSchedules", () => {
    it("should return all schedules for temple", async () => {
      mockPrisma.darshanSchedule.findMany.mockResolvedValue([mockSchedule]);

      const result = await service.getSchedules("temple-1");

      expect(result.data).toEqual([mockSchedule]);
      expect(mockPrisma.darshanSchedule.findMany).toHaveBeenCalledWith({
        where: { templeId: "temple-1" },
        orderBy: { displayOrder: "asc" },
        include: {
          slots: {
            where: { status: "ACTIVE" },
            orderBy: { date: "asc" },
            take: 60,
          },
        },
      });
    });
  });

  describe("getScheduleById", () => {
    it("should return schedule by id", async () => {
      mockPrisma.darshanSchedule.findUnique.mockResolvedValue(mockSchedule);

      const result = await service.getScheduleById("schedule-1");

      expect(result.data).toEqual(mockSchedule);
    });

    it("should throw if not found", async () => {
      mockPrisma.darshanSchedule.findUnique.mockResolvedValue(null);

      await expect(service.getScheduleById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("createSchedule", () => {
    it("should create schedule and generate slots", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      mockPrisma.darshanSchedule.create.mockResolvedValue(mockSchedule);
      mockPrisma.darshanSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.darshanSlot.createMany.mockResolvedValue({ count: 30 });

      const result = await service.createSchedule(
        "temple-1",
        {
          name: "Morning Darshan",
          startTime: "06:00",
          endTime: "12:00",
          maxCapacity: 50,
        },
        "ADMIN",
      );

      expect(result.data).toEqual(mockSchedule);
      expect(mockPrisma.darshanSlot.createMany).toHaveBeenCalled();
    });

    it("should throw if temple not found", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue(null);

      await expect(
        service.createSchedule(
          "invalid",
          {
            name: "Morning Darshan",
            startTime: "06:00",
            endTime: "12:00",
            maxCapacity: 50,
          },
          "ADMIN",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.createSchedule(
          "temple-1",
          {
            name: "Morning Darshan",
            startTime: "06:00",
            endTime: "12:00",
            maxCapacity: 50,
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("generateSlotsForSchedule", () => {
    it("should generate slots for 30 days", async () => {
      mockPrisma.darshanSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.darshanSlot.createMany.mockResolvedValue({ count: 30 });

      await service.generateSlotsForSchedule("schedule-1", 30);

      expect(mockPrisma.darshanSlot.createMany).toHaveBeenCalled();
    });
  });

  describe("getSlots", () => {
    it("should return slots with available capacity", async () => {
      mockPrisma.darshanSlot.findMany.mockResolvedValue([mockSlot]);
      mockPrisma.darshanSlot.count.mockResolvedValue(1);

      const result = await service.getSlots("temple-1", { date: "2026-08-20" });

      expect(result.data.slots).toHaveLength(1);
      expect(result.data.slots[0].availableCapacity).toBe(40);
    });
  });

  describe("getAvailability", () => {
    it("should return availability for date", async () => {
      mockPrisma.darshanSchedule.findMany.mockResolvedValue([
        { ...mockSchedule, slots: [mockSlot] },
      ]);

      const result = await service.getAvailability("temple-1", "2026-08-20");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].slots[0].availableCapacity).toBe(40);
    });
  });

  describe("updateSlot", () => {
    it("should update slot capacity", async () => {
      mockPrisma.darshanSlot.update.mockResolvedValue({
        ...mockSlot,
        capacity: 100,
      });

      const result = await service.updateSlot(
        "slot-1",
        { capacity: 100 },
        "STAFF",
      );

      expect(result.data.capacity).toBe(100);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.updateSlot("slot-1", { capacity: 100 }, "DEVOTEE"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("deleteSchedule", () => {
    it("should delete schedule", async () => {
      mockPrisma.darshanSchedule.delete.mockResolvedValue({});

      const result = await service.deleteSchedule("schedule-1", "ADMIN");

      expect(result.data?.message).toBe("Darshan schedule deleted");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(
        service.deleteSchedule("schedule-1", "MANAGER"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
