import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Headers,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";

import { PaymentService } from "./payment.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { RateLimit } from "../../common/decorators/rate-limit.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Payments")
@Controller("payments")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post("booking/:bookingId")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ points: 10, durationSeconds: 60, failClosed: true })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Cashfree payment order for booking" })
  async createBookingPayment(
    @Param("bookingId") bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.createPaymentForBooking(bookingId, user.id);
  }

  @Get(":id/status")
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit({ points: 20, durationSeconds: 60, failClosed: false })
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Reconcile / check authoritative payment status from gateway",
  })
  async getPaymentStatus(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.reconcilePayment(id, user.id, user.role);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Cashfree webhook handler (public, signature-verified)",
  })
  async handleWebhook(
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.paymentService.handleWebhook(req.body, headers);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user payments" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyPayments(
    @CurrentUser() user: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.paymentService.getUserPayments(user.id, { page, limit });
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment by ID" })
  async getById(@Param("id") id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Post(":id/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Refund payment (admin/manager only)" })
  async refund(
    @Param("id") id: string,
    @Body() data: { amountPaise?: number },
    @CurrentUser() user: any,
  ) {
    return this.paymentService.refundPayment(id, data.amountPaise, user.role);
  }
}
