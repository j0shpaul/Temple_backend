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

import { AccommodationService } from "./accommodation.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Accommodation")
@Controller("temples/:templeId/accommodation")
export class AccommodationController {
  constructor(private accommodationService: AccommodationService) {}

  // Rooms
  @Get("rooms")
  @ApiOperation({ summary: "List rooms for a temple" })
  @ApiQuery({ name: "status", required: false, type: String })
  async listRooms(
    @Param("templeId") templeId: string,
    @Query("status") status?: string,
  ) {
    return this.accommodationService.listRooms(templeId, status);
  }

  @Post("rooms")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create room (manager+)" })
  async createRoom(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.accommodationService.createRoom(templeId, data, user.role);
  }

  @Get("rooms/:id")
  @ApiOperation({ summary: "Get room by ID" })
  async getRoom(@Param("id") id: string) {
    return this.accommodationService.getRoom(id);
  }

  @Put("rooms/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update room (manager+)" })
  async updateRoom(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.accommodationService.updateRoom(id, data, user.role);
  }

  @Delete("rooms/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete room (admin only)" })
  async deleteRoom(@Param("id") id: string, @CurrentUser() user: any) {
    return this.accommodationService.deleteRoom(id, user.role);
  }

  // Availability
  @Get("availability")
  @ApiOperation({ summary: "Get room availability for date range" })
  @ApiQuery({
    name: "checkIn",
    required: true,
    type: String,
    description: "YYYY-MM-DD",
  })
  @ApiQuery({
    name: "checkOut",
    required: true,
    type: String,
    description: "YYYY-MM-DD",
  })
  async getAvailability(
    @Param("templeId") templeId: string,
    @Query("checkIn") checkIn: string,
    @Query("checkOut") checkOut: string,
  ) {
    return this.accommodationService.getAvailability(
      templeId,
      checkIn,
      checkOut,
    );
  }

  // Bookings
  @Post("bookings")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create accommodation booking" })
  async createBooking(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.accommodationService.createBooking(user.id, {
      ...data,
      templeId,
    });
  }

  @Post("bookings/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify booking payment" })
  async verifyPayment(@Body() data: any) {
    return this.accommodationService.verifyBookingPayment(data);
  }

  @Get("bookings/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user bookings" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyBookings(
    @CurrentUser() user: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.accommodationService.getUserBookings(user.id, { page, limit });
  }

  @Get("bookings/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get booking by ID" })
  async getBooking(@Param("id") id: string) {
    return this.accommodationService.getBookingById(id);
  }

  @Get("bookings")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get temple bookings (staff+)" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getTempleBookings(
    @Param("templeId") templeId: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.accommodationService.getTempleBookings(templeId, {
      status,
      page,
      limit,
    });
  }

  @Post("bookings/:id/check-in")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check in booking (staff+)" })
  async checkIn(
    @Param("id") id: string,
    @Body() data: { templeId: string },
    @CurrentUser() user: any,
  ) {
    return this.accommodationService.checkIn(id, data.templeId, user.id);
  }

  @Post("bookings/:id/check-out")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Check out booking (staff+)" })
  async checkOut(@Param("id") id: string, @Body() data: { templeId: string }) {
    return this.accommodationService.checkOut(id, data.templeId);
  }

  @Post("bookings/:id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel booking" })
  async cancelBooking(@Param("id") id: string, @CurrentUser() user: any) {
    return this.accommodationService.cancelBooking(id, user.id, user.role);
  }
}
