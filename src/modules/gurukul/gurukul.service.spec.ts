import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { GurukulService } from "./gurukul.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("GurukulService", () => {
  let service: GurukulService;
  let prisma: PrismaService;

  const mockGurukul = {
    id: "gurukul-1",
    templeId: "temple-1",
    name: "Shree Neelkantheshwar Mahadev Ved Vedang Gurukulam",
    description: "Traditional Vedic Gurukul",
    about: "Established for Vedic studies",
    philosophy: "Sanatan Vedic Gurukul Parampara",
    admissionInfo: "Admissions open for ages 8-14",
    contactInfo: "gurukul@temple.org",
    rules: "Strict Vedic discipline",
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    schedules: [],
  };

  const mockSchedule = {
    id: "sch-1",
    gurukulId: "gurukul-1",
    activityName: "Pratah Smaran",
    description: "Morning prayers and chanting",
    startTime: "04:00 AM",
    endTime: "05:00 AM",
    displayOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmission = {
    id: "adm-1",
    gurukulId: "gurukul-1",
    studentName: "Aarav Sharma",
    guardianName: "Ramesh Sharma",
    phone: "+919876543210",
    email: "parent@example.com",
    status: "PENDING",
    adminNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma: any = {
    gurukul: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    gurukulSchedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    gurukulAdmission: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GurukulService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<GurukulService>(GurukulService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getGurukul", () => {
    it("should return active gurukul", async () => {
      mockPrisma.gurukul.findFirst.mockResolvedValue(mockGurukul);

      const result = await service.getGurukul();
      expect(result.data!.name).toBe(
        "Shree Neelkantheshwar Mahadev Ved Vedang Gurukulam",
      );
    });

    it("should throw if gurukul not found", async () => {
      mockPrisma.gurukul.findFirst.mockResolvedValue(null);

      await expect(service.getGurukul()).rejects.toThrow(NotFoundException);
    });
  });

  describe("getDincharya", () => {
    it("should return active schedule", async () => {
      mockPrisma.gurukul.findFirst.mockResolvedValue(mockGurukul);
      mockPrisma.gurukulSchedule.findMany.mockResolvedValue([mockSchedule]);

      const result = await service.getDincharya();
      expect(result.data).toEqual([mockSchedule]);
    });
  });

  describe("createAdmission", () => {
    it("should create admission with PENDING status", async () => {
      mockPrisma.gurukul.findFirst.mockResolvedValue(mockGurukul);
      mockPrisma.gurukulAdmission.create.mockResolvedValue(mockAdmission);

      const result = await service.createAdmission({
        studentName: "Aarav Sharma",
        guardianName: "Ramesh Sharma",
        phone: "+919876543210",
      });

      expect(result.data!.studentName).toBe("Aarav Sharma");
      expect(mockPrisma.gurukulAdmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "PENDING",
            studentName: "Aarav Sharma",
          }),
        }),
      );
    });
  });

  describe("adminUpdateAdmission", () => {
    it("should update status and adminNotes for staff/admin", async () => {
      mockPrisma.gurukulAdmission.findUnique.mockResolvedValue(mockAdmission);
      mockPrisma.gurukulAdmission.update.mockResolvedValue({
        ...mockAdmission,
        status: "APPROVED",
        adminNotes: "Eligible candidate",
      });

      const result = await service.adminUpdateAdmission(
        "adm-1",
        { status: "APPROVED" as any, adminNotes: "Eligible candidate" },
        "ADMIN",
      );

      expect(result.data!.status).toBe("APPROVED");
    });

    it("should throw Forbidden for devotee", async () => {
      await expect(
        service.adminUpdateAdmission(
          "adm-1",
          { status: "APPROVED" as any },
          "DEVOTEE",
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
