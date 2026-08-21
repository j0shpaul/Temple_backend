import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";
import { IdUtil } from "../../common/utils/id.util";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

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
  private readonly REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days
  private readonly DEV_OTP: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.DEV_OTP = configService.get<string>("DEV_OTP") || "123456";
  }

  async sendOtp(dto: SendOtpDto): Promise<ApiResponseDto<{ message: string }>> {
    const { phone } = dto;
    const normalizedPhone = this.normalizePhone(phone);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    // Generate OTP
    const otp =
      process.env.NODE_ENV !== "production"
        ? this.DEV_OTP
        : IdUtil.generateOTP();

    // Store OTP in Redis with TTL
    const otpKey = `otp:${normalizedPhone}`;
    await this.redis.setex(otpKey, this.OTP_TTL, otp);

    // In dev mode, return OTP in response for testing
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

    // Verify OTP
    const otpKey = `otp:${normalizedPhone}`;
    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    // Delete OTP after successful verification
    await this.redis.del(otpKey);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone: normalizedPhone,
          status: "ACTIVE",
          role: "DEVOTEE",
        },
      });
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
        createdAt: true,
        addresses: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return ApiResponseDto.success(user);
  }

  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<ApiResponseDto<any>> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
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
