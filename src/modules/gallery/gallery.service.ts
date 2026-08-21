import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class GalleryService {
  constructor(private prisma: PrismaService) {}

  async create(
    templeId: string,
    data: {
      mediaId: string;
      title?: string;
      caption?: string;
      category?: string;
      displayOrder?: number;
      isActive?: boolean;
    },
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) {
      throw new NotFoundException("Temple not found");
    }

    const media = await this.prisma.media.findUnique({
      where: { id: data.mediaId },
    });
    if (!media) {
      throw new NotFoundException("Media not found");
    }

    const item = await this.prisma.galleryItem.create({
      data: {
        templeId,
        mediaId: data.mediaId,
        title: data.title,
        caption: data.caption,
        category: data.category,
        displayOrder: data.displayOrder || 0,
        isActive: data.isActive ?? true,
      },
    });

    return ApiResponseDto.success(item);
  }

  async findByTemple(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const items = await this.prisma.galleryItem.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: { media: true },
    });

    return ApiResponseDto.success(items);
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const item = await this.prisma.galleryItem.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!item) {
      throw new NotFoundException("Gallery item not found");
    }
    return ApiResponseDto.success(item);
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      caption: string;
      category: string;
      displayOrder: number;
      isActive: boolean;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const item = await this.prisma.galleryItem.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(item);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete gallery item");
    }

    await this.prisma.galleryItem.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Gallery item deleted" });
  }
}
