import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { PaathService } from "./paath.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("PaathService", () => {
  let service: PaathService;
  let prisma: PrismaService;

  const mockPaath = {
    id: "paath-1",
    templeId: "temple-1",
    title: "Maha Mrityunjaya Mantra",
    sanskritText: "ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्",
    transliteration: "Om Tryambakam Yajamahe Sugandhim Pushti-Vardhanam",
    hindiMeaning: "हम त्रिनेत्रधारी भगवान शिव की पूजा करते हैं",
    englishMeaning: "We worship the three-eyed Lord Shiva",
    audioUrl: "https://example.com/audio.mp3",
    durationSeconds: 108,
    category: "Vedic Mantra",
    isPublished: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma: any = {
    paath: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaathService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaathService>(PaathService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAllPublished", () => {
    it("should return published items only", async () => {
      mockPrisma.paath.findMany.mockResolvedValue([mockPaath]);
      mockPrisma.paath.count.mockResolvedValue(1);

      const result = await service.findAllPublished({ page: 1, limit: 10 });
      expect(result.data!.items).toEqual([mockPaath]);
      expect(mockPrisma.paath.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublished: true }),
        }),
      );
    });
  });

  describe("findById", () => {
    it("should return item by ID if published", async () => {
      mockPrisma.paath.findUnique.mockResolvedValue(mockPaath);

      const result = await service.findById("paath-1");
      expect(result.data).toEqual(mockPaath);
    });

    it("should throw if not found or unpublished", async () => {
      mockPrisma.paath.findUnique.mockResolvedValue(null);

      await expect(service.findById("invalid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("should create item for admin", async () => {
      mockPrisma.paath.create.mockResolvedValue(mockPaath);

      const result = await service.create(
        {
          title: mockPaath.title,
          sanskritText: mockPaath.sanskritText,
          transliteration: mockPaath.transliteration,
          hindiMeaning: mockPaath.hindiMeaning,
        },
        "ADMIN",
      );

      expect(result.data).toEqual(mockPaath);
      expect(mockPrisma.paath.create).toHaveBeenCalled();
    });

    it("should throw Forbidden for non-admin", async () => {
      await expect(
        service.create(
          {
            title: mockPaath.title,
            sanskritText: mockPaath.sanskritText,
            transliteration: mockPaath.transliteration,
            hindiMeaning: mockPaath.hindiMeaning,
          },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("delete", () => {
    it("should delete item for admin", async () => {
      mockPrisma.paath.findUnique.mockResolvedValue(mockPaath);
      mockPrisma.paath.delete.mockResolvedValue(mockPaath);

      const result = await service.delete("paath-1", "ADMIN");
      expect(result.data!.message).toBeDefined();
    });

    it("should throw Forbidden for staff", async () => {
      await expect(service.delete("paath-1", "DEVOTEE")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
