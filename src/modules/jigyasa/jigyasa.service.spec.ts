import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { JigyasaService } from "./jigyasa.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("JigyasaService", () => {
  let service: JigyasaService;
  let prisma: PrismaService;

  const mockJigyasa = {
    id: "jig-1",
    userId: null,
    askerName: "Amit Verma",
    askerPhone: "+919876543210",
    question: "What is the spiritual significance of lighting a Diya?",
    category: "Rituals & Traditions",
    answer: "Lighting a Diya symbolizes removing darkness of ignorance with the light of knowledge.",
    answeredBy: "Temple Scholar",
    answeredAt: new Date(),
    status: "ANSWERED",
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma: any = {
    jigyasa: {
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
        JigyasaService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JigyasaService>(JigyasaService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getPublicJigyasa", () => {
    it("should strictly return answered and public questions", async () => {
      mockPrisma.jigyasa.findMany.mockResolvedValue([mockJigyasa]);
      mockPrisma.jigyasa.count.mockResolvedValue(1);

      const result = await service.getPublicJigyasa({});
      expect(result.data!.items).toEqual([mockJigyasa]);
      expect(mockPrisma.jigyasa.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "ANSWERED",
            isPublic: true,
          }),
        }),
      );
    });
  });

  describe("submitQuestion", () => {
    it("should create question with PENDING status and isPublic false", async () => {
      mockPrisma.jigyasa.create.mockResolvedValue({
        id: "jig-new",
        status: "PENDING",
        isPublic: false,
      });

      const result = await service.submitQuestion({
        askerName: "Amit Verma",
        question: "How to perform Sandhya Vandanam?",
      });

      expect(result.data!.id).toBe("jig-new");
      expect(mockPrisma.jigyasa.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING",
            isPublic: false,
          }),
        }),
      );
    });
  });

  describe("adminAnswerQuestion", () => {
    it("should update answer, status to ANSWERED and publish", async () => {
      mockPrisma.jigyasa.findUnique.mockResolvedValue(mockJigyasa);
      mockPrisma.jigyasa.update.mockResolvedValue({
        ...mockJigyasa,
        answer: "Detailed answer",
        status: "ANSWERED",
      });

      const result = await service.adminAnswerQuestion(
        "jig-1",
        { answer: "Detailed answer", isPublic: true },
        "Head Priest",
        "ADMIN",
      );

      expect(result.data!.status).toBe("ANSWERED");
      expect(mockPrisma.jigyasa.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            answer: "Detailed answer",
            status: "ANSWERED",
            isPublic: true,
          }),
        }),
      );
    });

    it("should throw Forbidden for non-admin/staff", async () => {
      await expect(
        service.adminAnswerQuestion(
          "jig-1",
          { answer: "Answer" },
          "Devotee",
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
