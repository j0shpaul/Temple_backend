import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PagesService } from "./pages.service";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

describe("PagesService", () => {
  let service: PagesService;

  const mockTemple = {
    id: "temple-1",
    name: "Shree Siddhivinayak Temple",
    description: "Historic Ganpati temple",
    address: "Prabhadevi",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400028",
    establishedYear: 1801,
    contactPhone: "+912224223206",
    contactEmail: "info@siddhivinayak.org",
    status: "ACTIVE",
    info: {
      history: "Built in 1801...",
      architecture: "Mandap architecture",
      timings: "05:30 AM - 10:00 PM",
      guidelines: "Traditional attire requested",
      about: "One of the richest temples",
    },
  };

  const mockPrisma: any = {
    temple: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    galleryItem: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    darshanSchedule: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    darshanSlot: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    aartiSchedule: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    puja: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    seva: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    event: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    announcement: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    prasadProduct: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    deity: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    room: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    accommodationBooking: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    donationCause: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockRedis: any = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue("OK"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PagesService>(PagesService);
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue("OK");
    mockPrisma.temple.findFirst.mockResolvedValue(mockTemple);
    mockPrisma.temple.findUnique.mockResolvedValue(mockTemple);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getHomePage", () => {
    it("should return home page aggregation and cache result", async () => {
      mockRedis.get.mockResolvedValue(null);
      const res = await service.getHomePage("temple-1");

      expect(res.success).toBe(true);
      expect(res.data.temple.name).toBe(mockTemple.name);
      expect(res.data.hero).toBeDefined();
      expect(res.data.todayDarshan).toBeDefined();
      expect(res.data.todayAarti).toBeDefined();
      expect(res.data.featuredPuja).toBeDefined();
      expect(res.data.featuredSeva).toBeDefined();
      expect(res.data.upcomingEvents).toBeDefined();
      expect(res.data.announcements).toBeDefined();
      expect(res.data.featuredPrasad).toBeDefined();
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it("should return cached data if present", async () => {
      const cachedData = { temple: { id: "temple-1", name: "Cached Temple" } };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const res = await service.getHomePage("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.temple.name).toBe("Cached Temple");
      expect(mockPrisma.galleryItem.findMany).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if temple not found", async () => {
      mockPrisma.temple.findUnique.mockResolvedValue(null);
      await expect(service.getHomePage("non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getAboutPage", () => {
    it("should return about page details", async () => {
      const res = await service.getAboutPage("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.info.history).toBe(mockTemple.info.history);
      expect(res.data.deities).toBeDefined();
    });
  });

  describe("getDarshanPage", () => {
    it("should return darshan availability and schedules", async () => {
      const res = await service.getDarshanPage("temple-1", "2026-08-25");
      expect(res.success).toBe(true);
      expect(res.data.selectedDate).toBe("2026-08-25");
      expect(res.data.schedules).toBeDefined();
      expect(res.data.slots).toBeDefined();
    });
  });

  describe("getPujaPage", () => {
    it("should return pujas with available slots and deities filter", async () => {
      const res = await service.getPujaPage("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.pujas).toBeDefined();
      expect(res.data.deities).toBeDefined();
    });
  });

  describe("getSevaPage", () => {
    it("should return sevas with available slots and deities filter", async () => {
      const res = await service.getSevaPage("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.sevas).toBeDefined();
      expect(res.data.deities).toBeDefined();
    });
  });

  describe("getEventsPage", () => {
    it("should return paginated events", async () => {
      const res = await service.getEventsPage("temple-1", 1, 10, true);
      expect(res.success).toBe(true);
      expect(res.data.events).toBeDefined();
      expect(res.data.pagination).toBeDefined();
      expect(res.data.pagination.page).toBe(1);
    });
  });

  describe("getPrasadPage", () => {
    it("should return prasad products with stock status and pagination", async () => {
      const res = await service.getPrasadPage("temple-1", 1, 20);
      expect(res.success).toBe(true);
      expect(res.data.products).toBeDefined();
      expect(res.data.pagination).toBeDefined();
    });
  });

  describe("getAccommodationPage", () => {
    it("should return room types and availability summary", async () => {
      const res = await service.getAccommodationPage("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.roomTypes).toBeDefined();
      expect(res.data.rules).toBeDefined();
    });
  });

  describe("getDonationsPage", () => {
    it("should return causes and 80G tax exemption info", async () => {
      const res = await service.getDonationsPage("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.causes).toBeDefined();
      expect(res.data.taxExemption).toBeDefined();
      expect(res.data.suggestedAmountsPaise).toBeDefined();
    });
  });

  describe("getTempleOverview", () => {
    it("should return comprehensive temple overview", async () => {
      const res = await service.getTempleOverview("temple-1");
      expect(res.success).toBe(true);
      expect(res.data.temple).toBeDefined();
      expect(res.data.timings).toBeDefined();
      expect(res.data.contact).toBeDefined();
      expect(res.data.location).toBeDefined();
    });
  });
});
