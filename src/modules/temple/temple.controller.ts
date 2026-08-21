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

import { TempleService } from "./temple.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@ApiTags("Temple")
@Controller("temples")
export class TempleController {
  constructor(private templeService: TempleService) {}

  @Get()
  @ApiOperation({ summary: "List all temples" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "INACTIVE"] })
  @ApiQuery({ name: "search", required: false, type: String })
  async findAll(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: "ACTIVE" | "INACTIVE",
    @Query("search") search?: string,
  ) {
    return this.templeService.findAll({ page, limit, status, search });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get temple by ID (public)" })
  async findById(@Param("id") id: string) {
    return this.templeService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create temple (admin only)" })
  async create(@Body() data: any, @CurrentUser() user: any) {
    return this.templeService.create(data);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update temple (admin only)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.templeService.update(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete temple (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.templeService.delete(id, user.role);
  }
}
