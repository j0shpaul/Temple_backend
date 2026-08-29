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

import { DarshanService } from "./darshan.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Darshan")
@Controller("temples/:templeId/darshan")
export class DarshanController {
  constructor(private darshanService: DarshanService) {}

  @Get("schedules")
  @ApiOperation({ summary: "List darshan schedules for a temple" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async getSchedules(
    @Param("templeId") templeId: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.darshanService.getSchedules(templeId, isActive);
  }

  @Get("schedules/:id")
  @ApiOperation({ summary: "Get darshan schedule by ID" })
  async getScheduleById(@Param("id") id: string) {
    return this.darshanService.getScheduleById(id);
  }

  @Get("slots")
  @ApiOperation({ summary: "List darshan slots with availability" })
  @ApiQuery({
    name: "date",
    required: false,
    type: String,
    description: "YYYY-MM-DD",
  })
  @ApiQuery({ name: "scheduleId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "INACTIVE"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getSlots(
    @Param("templeId") templeId: string,
    @Query("date") date?: string,
    @Query("scheduleId") scheduleId?: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE",
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.darshanService.getSlots(templeId, {
      date,
      scheduleId,
      status,
      page,
      limit,
    });
  }

  @Get("availability/:date")
  @ApiOperation({ summary: "Get darshan availability for a specific date" })
  async getAvailability(
    @Param("templeId") templeId: string,
    @Param("date") date: string,
  ) {
    return this.darshanService.getAvailability(templeId, date);
  }

  @Post("schedules")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create darshan schedule (staff+)" })
  async createSchedule(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.darshanService.createSchedule(templeId, data, user.role);
  }

  @Put("schedules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update darshan schedule (staff+)" })
  async updateSchedule(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.darshanService.updateSchedule(id, data, user.role);
  }

  @Put("slots/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update darshan slot capacity/status (staff+)" })
  async updateSlot(
    @Param("id") id: string,
    @Body() data: { capacity?: number; status?: "ACTIVE" | "INACTIVE" },
    @CurrentUser() user: any,
  ) {
    return this.darshanService.updateSlot(id, data, user.role);
  }

  @Delete("schedules/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete darshan schedule (admin only)" })
  async deleteSchedule(@Param("id") id: string, @CurrentUser() user: any) {
    return this.darshanService.deleteSchedule(id, user.role);
  }
}
