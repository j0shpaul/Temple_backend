import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { AuthService, SendOtpDto, VerifyOtpDto } from "./auth.service";
import { RedisService } from "../redis/redis.service";
import { SmsService } from "./sms/sms.service";
import { Role, UserStatus } from "@prisma/client";
import { createHash } from "crypto";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let redisService: RedisService;
  let configService: ConfigService;

  const mockUser = {
    id: "user-1",
    phone: "+919876543210",
    email: "test@example.com",
    name: "Test User",
    role: Role.DEVOTEE,
    status: UserStatus.ACTIVE,
    isVerified: true,
    passwordHash: "hashed-password",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockRedisService = {
    setex: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "DEV_OTP") return "123456";
      return null;
    }),
  };

  const mockSmsService = {
    sendOtp: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SmsService, useValue: mockSmsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("sendOtp", () => {
    it("should send OTP for existing user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setex.mockResolvedValue("OK");

      const dto: SendOtpDto = { phone: "+919876543210" };
      const result = await service.sendOtp(dto);

      expect(result).toBeDefined();
      expect(result.data?.message).toContain("OTP sent");
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { phone: "+919876543210" },
      });
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it("should send OTP for new user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setex.mockResolvedValue("OK");

      const dto: SendOtpDto = { phone: "+919876543210" };
      const result = await service.sendOtp(dto);

      expect(result).toBeDefined();
      expect(result.data?.message).toContain("OTP sent");
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it("should reject rapid OTP requests within cooldown period", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.includes("otp_cooldown")) return "1";
        return null;
      });

      const dto: SendOtpDto = { phone: "+919876543210" };
      await expect(service.sendOtp(dto)).rejects.toThrow(
        "Please wait 60 seconds before requesting another OTP.",
      );
    });

    it("should reject OTP request for suspended user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      mockRedisService.get.mockResolvedValue(null);

      const dto: SendOtpDto = { phone: "+919876543210" };
      await expect(service.sendOtp(dto)).rejects.toThrow(
        "Your account is suspended. Please contact temple administration.",
      );
    });
  });

  describe("verifyOtp", () => {
    it("should verify OTP and return tokens", async () => {
      const hashedOtp = createHash("sha256").update("123456").digest("hex");
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("otp:")) return hashedOtp;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce("access-token")
        .mockReturnValueOnce("refresh-token");
      mockRedisService.setex.mockResolvedValue("OK");

      const dto: VerifyOtpDto = { phone: "+919876543210", otp: "123456" };
      const result = await service.verifyOtp(dto);

      expect(result.success).toBe(true);
      expect(result.data?.user.id).toBe(mockUser.id);
      expect(result.data?.user.phone).toBe(mockUser.phone);
      expect(result.data?.tokens.accessToken).toBe("access-token");
      expect(result.data?.tokens.refreshToken).toBeDefined();
      expect(result.data?.tokens.expiresIn).toBe(900);
    });

    it("should throw error for invalid OTP and track attempts", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("otp:")) return "123456";
        if (key.startsWith("otp_attempts:")) return "1";
        return null;
      });

      const dto: VerifyOtpDto = { phone: "+919876543210", otp: "999999" };
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        "Invalid or expired OTP",
      );
      expect(mockRedisService.setex).toHaveBeenCalledWith(
        expect.stringContaining("otp_attempts:"),
        300,
        "2",
      );
    });

    it("should invalidate OTP and lock out after 5 failed attempts", async () => {
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("otp:")) return "123456";
        if (key.startsWith("otp_attempts:")) return "5";
        return null;
      });

      const dto: VerifyOtpDto = { phone: "+919876543210", otp: "123456" };
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        "Too many failed verification attempts. OTP has been invalidated.",
      );
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it("should reject verification for suspended account", async () => {
      const hashedOtp = createHash("sha256").update("123456").digest("hex");
      mockRedisService.get.mockImplementation((key: string) => {
        if (key.startsWith("otp:")) return hashedOtp;
        return null;
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      const dto: VerifyOtpDto = { phone: "+919876543210", otp: "123456" };
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        "Your account is suspended. Please contact temple administration.",
      );
    });
  });

  describe("updateProfile", () => {
    it("should safely update name and email without mass-assigning role", async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: "user-1",
        phone: "+919876543210",
        email: "new@example.com",
        name: "New Name",
        role: "DEVOTEE",
        status: "ACTIVE",
        createdAt: new Date(),
      });

      const result = await service.updateProfile("user-1", {
        name: "New Name",
        email: "new@example.com",
        ...({ role: "SUPER_ADMIN" } as any),
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({ name: "New Name", email: "new@example.com" }),
        select: expect.any(Object),
      });
    });
  });

  describe("completeProfile", () => {
    it("should set isProfileComplete=true when name and email are provided", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        phone: "+919876543210",
        name: null,
        email: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: "user-1",
        phone: "+919876543210",
        name: "Rahul Sharma",
        email: "rahul@example.com",
        isProfileComplete: true,
      });

      const result = await service.completeProfile("user-1", {
        name: "Rahul Sharma",
        email: "rahul@example.com",
        gender: "Male",
      });

      expect(result.success).toBe(true);
      expect(result.data?.isProfileComplete).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: expect.objectContaining({
          name: "Rahul Sharma",
          email: "rahul@example.com",
          gender: "Male",
          isProfileComplete: true,
        }),
        select: expect.any(Object),
      });
    });

    it("should set isProfileComplete=false if required email is missing", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        phone: "+919876543210",
        name: null,
        email: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: "user-1",
        phone: "+919876543210",
        name: "Rahul Sharma",
        email: null,
        isProfileComplete: false,
      });

      const result = await service.completeProfile("user-1", {
        name: "Rahul Sharma",
      });

      expect(result.success).toBe(true);
      expect(result.data?.isProfileComplete).toBe(false);
    });
  });
});
