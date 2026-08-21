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

import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiOperation({ summary: "List all users (admin/staff)" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "role", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("role") role?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.usersService.findAll({ page, limit, role, status, search });
  }

  @Get("profile")
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Get(":id")
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiOperation({ summary: "Get user by ID (admin/staff)" })
  async findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Put(":id/role")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update user role (admin only)" })
  async updateRole(
    @Param("id") id: string,
    @Body("role") role: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateRole(id, role, user.id);
  }

  @Put(":id/status")
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiOperation({ summary: "Update user status (admin only)" })
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentUser() user: any,
  ) {
    return this.usersService.updateStatus(id, status, user.id);
  }

  @Post("addresses")
  @ApiOperation({ summary: "Add address for current user" })
  async addAddress(@CurrentUser() user: any, @Body() data: any) {
    return this.usersService.addAddress(user.id, data);
  }

  @Put("addresses/:addressId")
  @ApiOperation({ summary: "Update address" })
  async updateAddress(
    @CurrentUser() user: any,
    @Param("addressId") addressId: string,
    @Body() data: any,
  ) {
    return this.usersService.updateAddress(user.id, addressId, data);
  }

  @Delete("addresses/:addressId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete address" })
  async deleteAddress(
    @CurrentUser() user: any,
    @Param("addressId") addressId: string,
  ) {
    return this.usersService.deleteAddress(user.id, addressId);
  }
}
