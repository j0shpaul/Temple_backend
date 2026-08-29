import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual, createHash } from "crypto";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { IdUtil } from "../../common/utils/id.util";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { SmsService } from "./sms/sms.service";

export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly OTP_TTL = 300; // 5 minutes
  private readonly OTP_COOLDOWN_TTL = 60; // 60 seconds
  private readonly MAX_OTP_ATTEMPTS = 5;
  private readonly REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
  private readonly DEV_OTP: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
  ) {
    this.DEV_OTP = configService.get<string>("DEV_OTP") || "123456";
  }

  async sendOtp(dto: SendOtpDto): Promise<ApiResponseDto<{ message: string }>> {
    const { phone } = dto;
    const normalizedPhone = this.normalizePhone(phone);

    // 1. Cooldown protection (prevent rapid-fire OTP spamming)
    const cooldownKey = `otp_cooldown:${normalizedPhone}`;
    const inCooldown = await this.redis.get(cooldownKey);
    if (inCooldown) {
      throw new BadRequestException(
        "Please wait 60 seconds before requesting another OTP.",
      );
    }

    // Check if user exists and is suspended
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (user && user.status === "SUSPENDED") {
      throw new ForbiddenException(
        "Your account is suspended. Please contact temple administration.",
      );
    }

    // Generate OTP
    const otp =
      process.env.NODE_ENV === "production"
        ? IdUtil.generateOTP()
        : this.DEV_OTP;

    // Hash OTP using SHA-256 so plaintext OTP is never persisted in Redis
    const otpHash = createHash("sha256").update(otp).digest("hex");

    // Store hashed OTP in Redis with TTL
    const otpKey = `otp:${normalizedPhone}`;
    await this.redis.setex(otpKey, this.OTP_TTL, otpHash);
    await this.redis.setex(cooldownKey, this.OTP_COOLDOWN_TTL, "1");
    // Reset any prior failed attempts
    await this.redis.del(`otp_attempts:${normalizedPhone}`);

    // Dispatch OTP through SMS Provider
    try {
      await this.smsService.sendOtp(normalizedPhone, otp);
    } catch (error) {
      // If SMS delivery fails, remove cooldown so user can retry safely
      await this.redis.del(cooldownKey);
      throw error;
    }

    // In dev mode, return OTP in response for local testing. In production, NEVER return OTP!
    const message =
      process.env.NODE_ENV !== "production"
        ? `OTP sent (dev mode: ${otp})`
        : "OTP sent to your phone number";

    return ApiResponseDto.success({ message });
  }

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<ApiResponseDto<{ user: any; tokens: TokenPair }>> {
    const { phone, otp } = dto;
    const normalizedPhone = this.normalizePhone(phone);
    const otpKey = `otp:${normalizedPhone}`;
    const attemptKey = `otp_attempts:${normalizedPhone}`;

    // 1. Brute-force protection: check attempt count
    const attemptsStr = await this.redis.get(attemptKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    if (attempts >= this.MAX_OTP_ATTEMPTS) {
      await this.redis.del(otpKey);
      await this.redis.del(attemptKey);
      throw new UnauthorizedException(
        "Too many failed verification attempts. OTP has been invalidated. Please request a new OTP.",
      );
    }

    // 2. Fetch stored hash and compare against submitted OTP hash
    const storedHash = await this.redis.get(otpKey);
    const submittedHash = createHash("sha256").update(otp).digest("hex");
    const isMatch = Boolean(
      storedHash && this.timingSafeCompare(storedHash, submittedHash),
    );

    if (!isMatch) {
      const newAttempts = attempts + 1;
      await this.redis.setex(attemptKey, this.OTP_TTL, String(newAttempts));

      if (newAttempts >= this.MAX_OTP_ATTEMPTS) {
        await this.redis.del(otpKey);
        await this.redis.del(attemptKey);
        throw new UnauthorizedException(
          "Too many failed verification attempts. OTP has been invalidated. Please request a new OTP.",
        );
      }

      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // 3. Clear OTP, attempts, and cooldown on success
    await this.redis.del(otpKey);
    await this.redis.del(attemptKey);
    await this.redis.del(`otp_cooldown:${normalizedPhone}`);

    // 4. Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (user && user.status === "SUSPENDED") {
      throw new ForbiddenException(
        "Your account is suspended. Please contact temple administration.",
      );
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          status: "ACTIVE",
          role: "DEVOTEE",
          isVerified: true,
        },
      });
    } else if (!user.isVerified) {
      const updated = await this.prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
      });
      if (updated) user = updated;
    }

    // Generate token pair
    const tokens = await this.generateTokenPair(user);

    // Store refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return ApiResponseDto.success({
      user: this.sanitizeUser(user),
      tokens,
    });
  }

  private timingSafeCompare(a: string, b: string): boolean {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<ApiResponseDto<TokenPair>> {
    // Verify refresh token exists and is valid
    const stored = await this.redis.get(`refresh:${refreshToken}`);
    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const userId = stored;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User not found or inactive");
    }

    // Delete old refresh token
    await this.redis.del(`refresh:${refreshToken}`);

    // Generate new token pair
    const tokens = await this.generateTokenPair(user);

    // Store new refresh token
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return ApiResponseDto.success(tokens);
  }

  async logout(
    refreshToken: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    await this.redis.del(`refresh:${refreshToken}`);
    return ApiResponseDto.success({ message: "Logged out successfully" });
  }

  async getProfile(userId: string): Promise<ApiResponseDto<any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        dateOfBirth: true,
        gender: true,
        emergencyContact: true,
        latitude: true,
        longitude: true,
        isProfileComplete: true,
        createdAt: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return ApiResponseDto.success(user);
  }

  async completeProfile(
    userId: string,
    data: {
      name: string;
      email?: string;
      dateOfBirth?: string;
      gender?: string;
      emergencyContact?: string;
    },
  ): Promise<ApiResponseDto<any>> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new UnauthorizedException("User not found");
    }

    const finalName = data.name ?? existing.name;
    const finalEmail = data.email ?? existing.email;
    const isProfileComplete = Boolean(
      finalName && finalName.trim().length > 0 && finalEmail && finalEmail.trim().length > 0,
    );

    const updateData: any = {
      name: data.name,
      isProfileComplete,
    };
    if (data.email !== undefined) updateData.email = data.email;
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.emergencyContact !== undefined)
      updateData.emergencyContact = data.emergencyContact;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        dateOfBirth: true,
        gender: true,
        emergencyContact: true,
        latitude: true,
        longitude: true,
        isProfileComplete: true,
        createdAt: true,
      },
    });

    return ApiResponseDto.success(user);
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<ApiResponseDto<any>> {
    const safeData: { name?: string; email?: string } = {};
    if (typeof data?.name === "string") safeData.name = data.name;
    if (typeof data?.email === "string") safeData.email = data.email;

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    const finalName = safeData.name ?? existing?.name;
    const finalEmail = safeData.email ?? existing?.email;
    const isProfileComplete = Boolean(
      finalName && finalName.trim().length > 0 && finalEmail && finalEmail.trim().length > 0,
    );

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...safeData,
        isProfileComplete,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isProfileComplete: true,
        createdAt: true,
      },
    });

    return ApiResponseDto.success(user);
  }

  private async generateTokenPair(user: any): Promise<TokenPair> {
    const payload = { sub: user.id, phone: user.phone, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = IdUtil.generateQRToken();

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
    };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.redis.setex(
      `refresh:${refreshToken}`,
      this.REFRESH_TOKEN_TTL,
      userId,
    );
  }

  private normalizePhone(phone: string): string {
    // Remove spaces, dashes, and ensure it starts with country code
    let normalized = phone.replace(/[\s-]/g, "");
    if (!normalized.startsWith("+")) {
      // Assume India +91 if no country code
      if (normalized.length === 10) {
        normalized = `+91${normalized}`;
      } else if (normalized.length === 12 && normalized.startsWith("91")) {
        normalized = `+${normalized}`;
      }
    }
    return normalized;
  }

  private sanitizeUser(user: any): any {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}
