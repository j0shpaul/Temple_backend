import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";

import { PaymentService } from "./payment.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Payments")
@Controller("payments")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post("booking/:bookingId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create Razorpay order for booking" })
  async createBookingPayment(
    @Param("bookingId") bookingId: string,
    @CurrentUser() user: any,
  ) {
    return this.paymentService.createPaymentForBooking(bookingId, user.id);
  }

  @Post("verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify payment and confirm booking" })
  async verifyPayment(
    @Body()
    data: {
      bookingId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.paymentService.verifyPayment(data);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Razorpay webhook handler (public, no auth)" })
  async handleWebhook(@Req() req: any) {
    return this.paymentService.handleWebhook(req.body);
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
  @ApiOperation({ summary: "Refund payment (staff+)" })
  async refund(
    @Param("id") id: string,
    @Body() data: { amountPaise?: number },
    @CurrentUser() user: any,
  ) {
    return this.paymentService.refundPayment(id, data.amountPaise, user.role);
  }
}
