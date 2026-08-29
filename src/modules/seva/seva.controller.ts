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

import { SevaService } from "./seva.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Seva")
@Controller("temples/:templeId/seva")
export class SevaController {
  constructor(private sevaService: SevaService) {}

  @Get()
  @ApiOperation({ summary: "List seva services for a temple" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async findByTemple(
    @Param("templeId") templeId: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.sevaService.findByTemple(templeId, isActive);
  }

  @Get("availability/:date")
  @ApiOperation({ summary: "Get seva availability for a specific date" })
  async getAvailability(
    @Param("templeId") templeId: string,
    @Param("date") date: string,
  ) {
    return this.sevaService.getAvailability(templeId, date);
  }

  @Get("slots")
  @ApiOperation({ summary: "List seva slots with availability" })
  @ApiQuery({
    name: "date",
    required: false,
    type: String,
    description: "YYYY-MM-DD",
  })
  @ApiQuery({ name: "sevaId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "INACTIVE"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getSlots(
    @Param("templeId") templeId: string,
    @Query("date") date?: string,
    @Query("sevaId") sevaId?: string,
    @Query("status") status?: "ACTIVE" | "INACTIVE",
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.sevaService.getSlots(templeId, {
      date,
      sevaId,
      status,
      page,
      limit,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get seva by ID" })
  async findById(@Param("id") id: string) {
    return this.sevaService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create seva (staff+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.sevaService.create(templeId, data, user.role);
  }

  @Post("slots")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create seva slot (staff+)" })
  async createSlot(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.sevaService.createSlot(data.sevaId, data, user.role);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update seva (staff+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.sevaService.update(id, data, user.role);
  }

  @Put("slots/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update seva slot capacity/status (staff+)" })
  async updateSlot(
    @Param("id") id: string,
    @Body() data: { capacity?: number; status?: "ACTIVE" | "INACTIVE" },
    @CurrentUser() user: any,
  ) {
    return this.sevaService.updateSlot(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete seva (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.sevaService.delete(id, user.role);
  }
}
