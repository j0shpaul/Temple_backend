import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";

import { MahaprasadService } from "./mahaprasad.service";
import { CreateMahaprasadSlotDto } from "./dto/create-slot.dto";
import { UpdateMahaprasadSlotDto } from "./dto/update-slot.dto";
import { BookMahaprasadDto } from "./dto/book-mahaprasad.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Mahaprasad")
@Controller("mahaprasad")
export class MahaprasadController {
  constructor(private mahaprasadService: MahaprasadService) {}

  @Get("slots")
  @ApiOperation({ summary: "List available Mahaprasad dining slots (public)" })
  @ApiQuery({ name: "templeId", required: false, type: String })
  @ApiQuery({ name: "date", required: false, type: String, description: "YYYY-MM-DD" })
  async listSlots(
    @Query("templeId") templeId?: string,
    @Query("date") date?: string,
  ) {
    return this.mahaprasadService.listSlots({ templeId, date });
  }

  @Post("book")
  @ApiOperation({ summary: "Book Mahaprasad dining token/seats (public)" })
  async bookSlot(
    @Body() dto: BookMahaprasadDto,
    @CurrentUser() user: any,
  ) {
    return this.mahaprasadService.bookSlot(dto, user?.id);
  }

  @Get("booking/:reference")
  @ApiOperation({ summary: "Get Mahaprasad booking by reference (public)" })
  async getByReference(@Param("reference") reference: string) {
    return this.mahaprasadService.getBookingByReference(reference);
  }
}

@ApiTags("Mahaprasad Admin")
@Controller("admin/mahaprasad")
@UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
@Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
@ApiBearerAuth()
export class AdminMahaprasadController {
  constructor(private mahaprasadService: MahaprasadService) {}

  @Post("slots")
  @ApiOperation({ summary: "Create Mahaprasad dining slot (admin)" })
  async adminCreateSlot(
    @Body() dto: CreateMahaprasadSlotDto,
    @CurrentUser() user: any,
  ) {
    return this.mahaprasadService.adminCreateSlot(dto, user?.role);
  }

  @Put("slots/:id")
  @ApiOperation({ summary: "Update Mahaprasad dining slot (admin)" })
  async adminUpdateSlot(
    @Param("id") id: string,
    @Body() dto: UpdateMahaprasadSlotDto,
    @CurrentUser() user: any,
  ) {
    return this.mahaprasadService.adminUpdateSlot(id, dto, user?.role);
  }

  @Get("bookings")
  @ApiOperation({ summary: "List Mahaprasad bookings with filters (admin)" })
  @ApiQuery({ name: "slotId", required: false, type: String })
  @ApiQuery({ name: "date", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async adminGetBookings(
    @Query("slotId") slotId?: string,
    @Query("date") date?: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.mahaprasadService.adminGetBookings({
      slotId,
      date,
      status,
      page,
      limit,
    });
  }

  @Put("bookings/:id/cancel")
  @ApiOperation({ summary: "Cancel Mahaprasad booking & restore capacity (admin)" })
  async adminCancelBooking(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.mahaprasadService.adminCancelBooking(id, user?.role);
  }

  @Put("bookings/:id/checkin")
  @ApiOperation({ summary: "Mark Mahaprasad devotee checked-in at dining hall (admin)" })
  async adminCheckIn(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.mahaprasadService.adminCheckIn(id, user?.role);
  }
}
