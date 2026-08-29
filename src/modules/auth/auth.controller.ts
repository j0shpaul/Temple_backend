import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import { AuthService, SendOtpDto, VerifyOtpDto } from "./auth.service";
import { CompleteProfileDto } from "./dto/complete-profile.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("send-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 5, durationSeconds: 60, failClosed: true })
  @ApiOperation({ summary: "Send OTP to phone number" })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 10, durationSeconds: 60, failClosed: true })
  @ApiOperation({ summary: "Verify OTP and get access/refresh tokens" })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ points: 20, durationSeconds: 60, failClosed: true })
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  async refresh(@Body("refreshToken") refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout and invalidate refresh token" })
  async logout(@Body("refreshToken") refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @Post("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user profile" })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() data: { name?: string; email?: string },
  ) {
    return this.authService.updateProfile(user.id, data);
  }

  @Post("complete-profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Complete user registration profile details" })
  async completeProfile(
    @CurrentUser() user: any,
    @Body() dto: CompleteProfileDto,
  ) {
    return this.authService.completeProfile(user.id, dto);
  }
}
