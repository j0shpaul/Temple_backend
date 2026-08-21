import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { ConfigService } from "@nestjs/config";
import { AuthService, SendOtpDto, VerifyOtpDto } from "./auth.service";
import { RedisService } from "../redis/redis.service";
import { Role, UserStatus } from "@prisma/client";

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
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
      mockRedisService.setex.mockResolvedValue("OK");

      const dto: SendOtpDto = { phone: "+919876543210" };
      const result = await service.sendOtp(dto);

      expect(result).toBeDefined();
      expect(result.data?.message).toContain("OTP sent");
      expect(mockRedisService.setex).toHaveBeenCalled();
    });
  });

  describe("verifyOtp", () => {
    it("should verify OTP and return tokens", async () => {
      mockRedisService.get.mockResolvedValue("123456");
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

    it("should throw error for invalid OTP", async () => {
      mockRedisService.get.mockResolvedValue(null);

      const dto: VerifyOtpDto = { phone: "+919876543210", otp: "wrong-otp" };
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        "Invalid or expired OTP",
      );
    });

    it("should throw error for expired OTP", async () => {
      mockRedisService.get.mockResolvedValue("different-otp");

      const dto: VerifyOtpDto = { phone: "+919876543210", otp: "123456" };
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        "Invalid or expired OTP",
      );
    });
  });
});
