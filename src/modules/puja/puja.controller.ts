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

import { PujaService } from "./puja.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Puja")
@Controller("temples/:templeId/puja")
export class PujaController {
  constructor(private pujaService: PujaService) {}

  @Get()
  @ApiOperation({ summary: "List puja services for a temple" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async findByTemple(
    @Param("templeId") templeId: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.pujaService.findByTemple(templeId, isActive);
  }

  @Get("availability/:date")
  @ApiOperation({ summary: "Get puja availability for a specific date" })
  async getAvailability(
    @Param("templeId") templeId: string,
    @Param("date") date: string,
  ) {
    return this.pujaService.getAvailability(templeId, date);
  }

  @Get("slots")
  @ApiOperation({ summary: "List puja slots with availability" })
  @ApiQuery({
    name: "date",
    required: false,
    type: String,
    description: "YYYY-MM-DD",
  })
  @ApiQuery({ name: "pujaId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "INACTIVE"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getSlots(
    @Param("templeId") templeId: string,
    @Query("date") date?: string,
    @Query("pujaId") pujaId?: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE",
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.pujaService.getSlots(templeId, {
      date,
      pujaId,
      status,
      page,
      limit,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get puja service by ID" })
  async findById(@Param("id") id: string) {
    return this.pujaService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create puja service (staff+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.pujaService.create(templeId, data, user.role);
  }

  @Post("slots")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create puja slot (staff+)" })
  async createSlot(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.pujaService.createSlot(data.pujaId, data, user.role);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update puja service (staff+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.pujaService.update(id, data, user.role);
  }

  @Put("slots/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update puja slot capacity/status (staff+)" })
  async updateSlot(
    @Param("id") id: string,
    @Body() data: { capacity?: number; status?: "ACTIVE" | "INACTIVE" },
    @CurrentUser() user: any,
  ) {
    return this.pujaService.updateSlot(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete puja service (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.pujaService.delete(id, user.role);
  }
}
