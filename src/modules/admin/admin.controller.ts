import {
  Controller,
  Get,
  Post,
  Put,
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

import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Admin")
@Controller("admin")
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ============== AUDIT LOGS ==============

  @Get("audit-logs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get audit logs (admin+)" })
  @ApiQuery({ name: "actorId", required: false, type: String })
  @ApiQuery({ name: "action", required: false, type: String })
  @ApiQuery({ name: "entity", required: false, type: String })
  @ApiQuery({ name: "entityId", required: false, type: String })
  @ApiQuery({
    name: "from",
    required: false,
    type: String,
    description: "ISO date",
  })
  @ApiQuery({
    name: "to",
    required: false,
    type: String,
    description: "ISO date",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getAuditLogs(
    @Query("actorId") actorId?: string,
    @Query("action") action?: string,
    @Query("entity") entity?: string,
    @Query("entityId") entityId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getAuditLogs({
      actorId,
      action,
      entity,
      entityId,
      from,
      to,
      page,
      limit,
    });
  }

  @Get("audit-logs/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get audit log by ID (admin+)" })
  async getAuditLog(@Param("id") id: string) {
    return this.adminService.getAuditLogById(id);
  }

  // ============== CROWD STATUS ==============

  @Get("temples/:templeId/crowd")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get crowd status for temple (staff+)" })
  async getCrowdStatus(@Param("templeId") templeId: string) {
    return this.adminService.getCrowdStatus(templeId);
  }

  @Get("temples/:templeId/crowd/history")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get crowd history for temple (staff+)" })
  @ApiQuery({
    name: "from",
    required: false,
    type: String,
    description: "ISO date",
  })
  @ApiQuery({
    name: "to",
    required: false,
    type: String,
    description: "ISO date",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getCrowdHistory(
    @Param("templeId") templeId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getCrowdHistory(templeId, {
      from,
      to,
      page,
      limit,
    });
  }

  @Post("temples/:templeId/crowd/snapshot")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Record crowd snapshot (manager+)" })
  async recordCrowdSnapshot(
    @Param("templeId") templeId: string,
    @Body()
    data: {
      date?: string;
      level: string;
      occupancyPct: number;
      estimatedCount: number;
      availableCapacity: number;
      source?: string;
    },
  ) {
    return this.adminService.recordCrowdSnapshot(templeId, data);
  }

  // ============== USER MANAGEMENT ==============

  @Get("users")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List users (manager+)" })
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async listUsers(
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.listUsers({ role, status, search, page, limit });
  }

  @Get("users/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user by ID (manager+)" })
  async getUser(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Put("users/:id/role")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user role (admin+)" })
  async updateUserRole(
    @Param("id") id: string,
    @Body() data: { role: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserRole(id, data.role, user.role);
  }

  @Put("users/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user status (manager+)" })
  async updateUserStatus(
    @Param("id") id: string,
    @Body() data: { status: string },
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserStatus(id, data.status, user.role);
  }

  // ============== STATS & REPORTS ==============

  @Get("temples/:templeId/dashboard")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get dashboard stats for temple (manager+)" })
  async getDashboardStats(@Param("templeId") templeId: string) {
    return this.adminService.getDashboardStats(templeId);
  }

  @Get("temples/:templeId/revenue")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get revenue report for temple (manager+)" })
  @ApiQuery({
    name: "from",
    required: true,
    type: String,
    description: "ISO date",
  })
  @ApiQuery({
    name: "to",
    required: true,
    type: String,
    description: "ISO date",
  })
  @ApiQuery({
    name: "groupBy",
    required: false,
    type: String,
    enum: ["day", "week", "month"],
  })
  async getRevenueReport(
    @Param("templeId") templeId: string,
    @Query("from") from: string,
    @Query("to") to: string,
    @Query("groupBy") groupBy?: "day" | "week" | "month",
  ) {
    return this.adminService.getRevenueReport(templeId, { from, to, groupBy });
  }
}
