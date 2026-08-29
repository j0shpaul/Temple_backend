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

import { AartiService } from "./aarti.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Aarti")
@Controller("temples/:templeId/aarti")
export class AartiController {
  constructor(private aartiService: AartiService) {}

  @Get()
  @ApiOperation({ summary: "List aarti schedules for a temple" })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "INACTIVE"] })
  async findByTemple(
    @Param("templeId") templeId: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE",
  ) {
    return this.aartiService.findByTemple(templeId, status);
  }

  @Get("today")
  @ApiOperation({ summary: "Get today's aarti schedule" })
  async getTodaySchedule(@Param("templeId") templeId: string) {
    return this.aartiService.getTodaySchedule(templeId);
  }

  @Get("upcoming")
  @ApiOperation({ summary: "Get upcoming aarti schedules" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Days ahead (default 7)",
  })
  async getUpcoming(
    @Param("templeId") templeId: string,
    @Query("days") days?: number,
  ) {
    return this.aartiService.getUpcoming(templeId, days || 7);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get aarti schedule by ID" })
  async findById(@Param("id") id: string) {
    return this.aartiService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create aarti schedule (staff+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.aartiService.create(templeId, data, user.role);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update aarti schedule (staff+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.aartiService.update(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete aarti schedule (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.aartiService.delete(id, user.role);
  }
}
