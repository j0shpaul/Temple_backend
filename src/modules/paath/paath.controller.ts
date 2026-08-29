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

import { PaathService } from "./paath.service";
import { CreatePaathDto } from "./dto/create-paath.dto";
import { UpdatePaathDto } from "./dto/update-paath.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Paath")
@Controller("paath")
export class PaathController {
  constructor(private paathService: PaathService) {}

  @Get()
  @ApiOperation({ summary: "List published Nitya Paath & Shlokas (public)" })
  @ApiQuery({ name: "templeId", required: false, type: String })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Query("templeId") templeId?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.paathService.findAllPublished({
      templeId,
      category,
      search,
      page,
      limit,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single published Paath by ID (public)" })
  async findById(@Param("id") id: string) {
    return this.paathService.findById(id);
  }
}

@ApiTags("Paath Admin")
@Controller("admin/paath")
@UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
@Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
@ApiBearerAuth()
export class AdminPaathController {
  constructor(private paathService: PaathService) {}

  @Get()
  @ApiOperation({ summary: "List all Paath items including drafts (admin)" })
  @ApiQuery({ name: "templeId", required: false, type: String })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "isPublished", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async adminFindAll(
    @Query("templeId") templeId?: string,
    @Query("category") category?: string,
    @Query("isPublished") isPublished?: boolean,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.paathService.adminFindAll({
      templeId,
      category,
      isPublished:
        isPublished !== undefined ? String(isPublished) === "true" : undefined,
      page,
      limit,
    });
  }

  @Post()
  @ApiOperation({ summary: "Create new Paath / Shloka content (admin)" })
  async create(@Body() dto: CreatePaathDto, @CurrentUser() user: any) {
    return this.paathService.create(dto, user?.role);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update Paath content (admin)" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePaathDto,
    @CurrentUser() user: any,
  ) {
    return this.paathService.update(id, dto, user?.role);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiOperation({ summary: "Delete Paath content (admin)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.paathService.delete(id, user?.role);
  }

  @Put(":id/publish")
  @ApiOperation({ summary: "Publish or unpublish Paath content (admin)" })
  async setPublishStatus(
    @Param("id") id: string,
    @Body("isPublished") isPublished: boolean,
    @CurrentUser() user: any,
  ) {
    return this.paathService.setPublishStatus(id, Boolean(isPublished), user?.role);
  }
}
