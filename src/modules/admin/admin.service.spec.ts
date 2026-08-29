import { Test, TestingModule } from "@nestjs/testing";
import { AdminService } from "./admin.service";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "../booking/booking.service";
import { AccommodationService } from "../accommodation/accommodation.service";
import { PrasadService } from "../prasad/prasad.service";
import { Role } from "@prisma/client";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("AdminService", () => {
  let service: AdminService;
  let prisma: any;
  let bookingService: any;
  let accommodationService: any;
  let prasadService: any;

  beforeEach(async () => {
    prisma = {
      temple: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      staffAssignment: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
    };

    bookingService = {
      expirePendingBookings: jest.fn().mockResolvedValue(2),
    };
    accommodationService = {
      expirePendingBookings: jest.fn().mockResolvedValue(1),
    };
    prasadService = {
      expirePendingOrders: jest.fn().mockResolvedValue(3),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: BookingService, useValue: bookingService },
        { provide: AccommodationService, useValue: accommodationService },
        { provide: PrasadService, useValue: prasadService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe("assignStaff", () => {
    it("should successfully assign a staff/manager/admin user to a temple", async () => {
      prisma.temple.findUnique.mockResolvedValue({ id: "temple-1", name: "Main Temple" });
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", name: "Staff Member", role: Role.STAFF });
      prisma.staffAssignment.upsert.mockResolvedValue({
        id: "assign-1",
        userId: "user-1",
        templeId: "temple-1",
        user: { id: "user-1", name: "Staff Member", role: Role.STAFF },
        temple: { id: "temple-1", name: "Main Temple" },
      });

      const res = await service.assignStaff("temple-1", "user-1");
      expect(res.success).toBe(true);
      expect(res.data.id).toBe("assign-1");
      expect(prisma.staffAssignment.upsert).toHaveBeenCalledWith({
        where: {
          userId_templeId: {
            userId: "user-1",
            templeId: "temple-1",
          },
        },
        update: {},
        create: {
          userId: "user-1",
          templeId: "temple-1",
        },
        include: expect.any(Object),
      });
    });

    it("should reject assigning DEVOTEE role directly without role upgrade", async () => {
      prisma.temple.findUnique.mockResolvedValue({ id: "temple-1" });
      prisma.user.findUnique.mockResolvedValue({ id: "user-devotee", role: Role.DEVOTEE });

      await expect(service.assignStaff("temple-1", "user-devotee")).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException if temple does not exist", async () => {
      prisma.temple.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: "user-1", role: Role.STAFF });

      await expect(service.assignStaff("temple-invalid", "user-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeStaff", () => {
    it("should remove staff assignment successfully", async () => {
      prisma.staffAssignment.findUnique.mockResolvedValue({ id: "assign-1", userId: "user-1", templeId: "temple-1" });
      prisma.staffAssignment.delete.mockResolvedValue({ id: "assign-1" });

      const res = await service.removeStaff("temple-1", "user-1");
      expect(res.success).toBe(true);
      expect(res.data.removed).toBe(true);
    });

    it("should throw NotFoundException when assignment does not exist", async () => {
      prisma.staffAssignment.findUnique.mockResolvedValue(null);

      await expect(service.removeStaff("temple-1", "user-unknown")).rejects.toThrow(NotFoundException);
    });
  });

  describe("cleanupExpiredReservations", () => {
    it("should coordinate cleanup across booking, accommodation, and prasad services", async () => {
      const res = await service.cleanupExpiredReservations(30);
      expect(res.success).toBe(true);
      expect(res.data.totalCleaned).toBe(6);
      expect(bookingService.expirePendingBookings).toHaveBeenCalledWith(30);
      expect(accommodationService.expirePendingBookings).toHaveBeenCalledWith(30);
      expect(prasadService.expirePendingOrders).toHaveBeenCalledWith(30);
    });
  });
});
