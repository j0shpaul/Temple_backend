import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { Role, UserStatus } from "@prisma/client";

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockUser = {
    id: "user-1",
    phone: "+919876543210",
    email: "test@example.com",
    name: "Test User",
    role: Role.DEVOTEE,
    status: UserStatus.ACTIVE,
    passwordHash: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
    addresses: [],
    bookings: [],
    donations: [],
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    address: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findById", () => {
    it("should return user by id", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById("user-1");

      expect(result.data).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: expect.any(Object),
      });
    });

    it("should throw NotFoundException if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById("user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("should return paginated users", async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data?.users).toEqual([mockUser]);
      expect(result.data?.total).toBe(1);
      expect(result.data?.page).toBe(1);
    });
  });

  describe("updateRole", () => {
    it("should update user role", async () => {
      const updatedUser = { ...mockUser, role: Role.ADMIN };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateRole("user-1", "ADMIN", "actor-1");

      expect(result.data.role).toBe(Role.ADMIN);
    });

    it("should throw ForbiddenException when changing own role", async () => {
      await expect(
        service.updateRole("user-1", "ADMIN", "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateStatus", () => {
    it("should update user status", async () => {
      const updatedUser = { ...mockUser, status: UserStatus.INACTIVE };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateStatus(
        "user-1",
        "INACTIVE",
        "actor-1",
      );

      expect(result.data.status).toBe(UserStatus.INACTIVE);
    });

    it("should throw ForbiddenException when changing own status", async () => {
      await expect(
        service.updateStatus("user-1", "INACTIVE", "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("addAddress", () => {
    it("should create address for user", async () => {
      const address = {
        id: "addr-1",
        userId: "user-1",
        line1: "123 Main St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        phone: "+919876543210",
        isDefault: true,
        country: "India",
      };

      mockPrisma.address.create.mockResolvedValue(address);

      const result = await service.addAddress("user-1", {
        line1: "123 Main St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        phone: "+919876543210",
        isDefault: true,
      });

      expect(result.data).toEqual(address);
    });
  });
});
