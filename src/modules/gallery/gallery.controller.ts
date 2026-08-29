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

import { GalleryService } from "./gallery.service";
import { MediaUploadService } from "./media-upload.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@ApiTags("Gallery")
@Controller("temples/:templeId/gallery")
export class GalleryController {
  constructor(
    private galleryService: GalleryService,
    private mediaUploadService: MediaUploadService,
  ) {}

  @Post("presigned-url")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Generate pre-signed S3/Cloudinary upload signature/URL (staff+)",
  })
  async getPresignedUploadUrl(
    @Param("templeId") templeId: string,
    @Body()
    data: {
      category: "gallery" | "paath" | "gurukul" | "events" | "deities" | "general";
      fileName: string;
      mimeType: string;
      sizeBytes?: number;
    },
    @CurrentUser() user: any,
  ) {
    const result = await this.mediaUploadService.generatePresignedUpload(
      { ...data, templeId },
      user.role,
    );
    return ApiResponseDto.success(result);
  }

  @Get()
  @ApiOperation({ summary: "List gallery items for a temple (public)" })
  @ApiQuery({ name: "isPublished", required: false, type: Boolean })
  async findByTemple(
    @Param("templeId") templeId: string,
    @Query("isPublished") isPublished?: boolean,
  ) {
    return this.galleryService.findByTemple(templeId, isPublished);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get gallery item by ID (public)" })
  async findById(@Param("id") id: string) {
    return this.galleryService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create gallery item (staff+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.galleryService.create(templeId, data);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update gallery item (staff+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.galleryService.update(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete gallery item (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.galleryService.delete(id, user.role);
  }
}
