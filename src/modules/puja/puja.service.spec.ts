import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PujaService } from "./puja.service";
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

describe("PujaService", () => {
  let service: PujaService;
  let prisma: PrismaService;

  const mockPuja = {
    id: "puja-1",
    templeId: "temple-1",
    deityId: "deity-1",
    name: "Ganesh Puja",
    description: "Lord Ganesha worship",
    pricePaise: 50000,
    durationMinutes: 30,
    defaultCapacity: 10,
    isActive: true,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSlot = {
    id: "slot-1",
    pujaId: "puja-1",
    date: new Date("2026-08-20"),
    startTime: new Date("2026-08-20T08:00:00"),
    endTime: new Date("2026-08-20T08:30:00"),
    capacity: 10,
    bookedCount: 3,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    puja: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pujaSlot: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    deity: {
      findUnique: jest.fn(),
    },
    temple: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PujaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PujaService>(PujaService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findByTemple", () => {
    it("should return all pujas for temple", async () => {
      mockPrisma.puja.findMany.mockResolvedValue([mockPuja]);

      const result = await service.findByTemple("temple-1");

      expect(result.data).toEqual([mockPuja]);
      expect(mockPrisma.puja.findMany).toHaveBeenCalledWith({
        where: { templeId: "temple-1" },
        orderBy: { displayOrder: "asc" },
        include: { deity: { select: { id: true, name: true } } },
      });
    });
  });

  describe("findById", () => {
    it("should return puja by id", async () => {
      mockPrisma.puja.findUnique.mockResolvedValue(mockPuja);

      const result = await service.findById("puja-1");

      expect(result.data).toEqual(mockPuja);
    });

    it("should throw if not found", async () => {
      mockPrisma.puja.findUnique.mockResolvedValue(null);

      await expect(service.findById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create puja", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      mockPrisma.deity.findUnique.mockResolvedValue({
        id: "deity-1",
        templeId: "temple-1",
      });
      mockPrisma.puja.create.mockResolvedValue(mockPuja);

      const result = await service.create(
        "temple-1",
        {
          name: "Ganesh Puja",
          description: "Lord Ganesha worship",
          pricePaise: 50000,
          durationMinutes: 30,
          defaultCapacity: 10,
          deityId: "deity-1",
        },
        "ADMIN",
      );

      expect(result.data).toEqual(mockPuja);
    });

    it("should throw if temple not found", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          "invalid",
          {
            name: "Ganesh Puja",
            pricePaise: 50000,
          },
          "ADMIN",
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.create(
          "temple-1",
          {
            name: "Ganesh Puja",
            pricePaise: 50000,
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getAvailability", () => {
    it("should return availability with available capacity", async () => {
      mockPrisma.puja.findMany.mockResolvedValue([
        { ...mockPuja, slots: [mockSlot] },
      ]);

      const result = await service.getAvailability("temple-1", "2026-08-20");

      expect(result.data).toHaveLength(1);
      expect(result.data![0].slots[0].availableCapacity).toBe(7);
    });
  });

  describe("getSlots", () => {
    it("should return slots with available capacity", async () => {
      mockPrisma.pujaSlot.findMany.mockResolvedValue([mockSlot]);
      mockPrisma.pujaSlot.count.mockResolvedValue(1);

      const result = await service.getSlots("temple-1", { date: "2026-08-20" });

      expect(result.data.slots).toHaveLength(1);
      expect(result.data.slots[0].availableCapacity).toBe(7);
    });
  });

  describe("createSlot", () => {
    it("should create puja slot", async () => {
      mockPrisma.puja.findUnique.mockResolvedValue(mockPuja);
      mockPrisma.pujaSlot.create.mockResolvedValue(mockSlot);

      const result = await service.createSlot(
        "puja-1",
        {
          date: "2026-08-20",
          startTime: "08:00",
          endTime: "08:30",
          capacity: 10,
        },
        "STAFF",
      );

      expect(result.data).toEqual(mockSlot);
    });

    it("should throw ForbiddenException for insufficient permissions", async () => {
      await expect(
        service.createSlot(
          "puja-1",
          {
            date: "2026-08-20",
            startTime: "08:00",
            endTime: "08:30",
            capacity: 10,
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateSlot", () => {
    it("should update slot capacity", async () => {
      mockPrisma.pujaSlot.update.mockResolvedValue({
        ...mockSlot,
        capacity: 20,
      });

      const result = await service.updateSlot(
        "slot-1",
        { capacity: 20 },
        "STAFF",
      );

      expect(result.data.capacity).toBe(20);
    });
  });

  describe("update", () => {
    it("should update puja", async () => {
      mockPrisma.puja.update.mockResolvedValue({
        ...mockPuja,
        name: "Updated Puja",
      });

      const result = await service.update(
        "puja-1",
        { name: "Updated Puja" },
        "ADMIN",
      );

      expect(result.data.name).toBe("Updated Puja");
    });
  });

  describe("delete", () => {
    it("should delete puja", async () => {
      mockPrisma.puja.delete.mockResolvedValue({});

      const result = await service.delete("puja-1", "ADMIN");

      expect(result.data!.message).toBe("Puja service deleted");
    });

    it("should throw ForbiddenException for non-admin", async () => {
      await expect(service.delete("puja-1", "MANAGER")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
