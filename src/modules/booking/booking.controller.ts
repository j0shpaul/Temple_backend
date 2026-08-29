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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";

import { BookingService } from "./booking.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Booking")
@Controller("bookings")
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Post("puja")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create puja booking" })
  async createPujaBooking(@Body() data: any, @CurrentUser() user: any) {
    return this.bookingService.createPujaBooking(user.id, data);
  }

  @Post("seva")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create seva booking" })
  async createSevaBooking(@Body() data: any, @CurrentUser() user: any) {
    return this.bookingService.createSevaBooking(user.id, data);
  }

  @Post("darshan")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create darshan booking (free, auto-confirmed)" })
  async createDarshanBooking(@Body() data: any, @CurrentUser() user: any) {
    return this.bookingService.createDarshanBooking(user.id, data);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user bookings" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyBookings(
    @CurrentUser() user: any,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.bookingService.getUserBookings(user.id, {
      status,
      page,
      limit,
    });
  }

  @Get("reference/:reference")
  @ApiOperation({ summary: "Get booking by reference (public)" })
  async getByReference(@Param("reference") reference: string) {
    return this.bookingService.getByReference(reference);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get booking by ID" })
  async getById(@Param("id") id: string, @CurrentUser() user: any) {
    return this.bookingService.getById(id, user.id, user.role);
  }

  @Get("temple/:templeId")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get temple bookings (staff+)" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "bookingType", required: false, type: String })
  @ApiQuery({ name: "date", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getTempleBookings(
    @Param("templeId") templeId: string,
    @Query("status") status?: string,
    @Query("bookingType") bookingType?: string,
    @Query("date") date?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.bookingService.getTempleBookings(templeId, {
      status,
      bookingType,
      date,
      page,
      limit,
    });
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel booking" })
  async cancelBooking(
    @Param("id") id: string,
    @Body() data: { reason: string },
    @CurrentUser() user: any,
  ) {
    return this.bookingService.cancelBooking(
      id,
      user.id,
      data.reason,
      user.role,
    );
  }

  @Post(":id/check-in")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check in booking (staff+)" })
  async checkIn(
    @Param("id") id: string,
    @Body() data: { templeId: string },
    @CurrentUser() user: any,
  ) {
    return this.bookingService.markCheckedIn(id, data.templeId, user.id);
  }

  @Post("verify-qr")
  @ApiOperation({ summary: "Verify QR token (public for scanning)" })
  async verifyQr(@Body() data: { qrToken: string }) {
    return this.bookingService.verifyQrToken(data.qrToken);
  }
}
