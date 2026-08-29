import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { CreatePaathDto } from "./dto/create-paath.dto";
import { UpdatePaathDto } from "./dto/update-paath.dto";

@Injectable()
export class PaathService {
  constructor(private prisma: PrismaService) {}

  async findAllPublished(params: {
    templeId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { templeId, category, search, page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { isPublished: true };
    if (templeId) where.templeId = templeId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { sanskritText: { contains: search, mode: "insensitive" } },
        { transliteration: { contains: search, mode: "insensitive" } },
        { hindiMeaning: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.paath.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.paath.count({ where }),
    ]);

    return ApiResponseDto.success(
      { items, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const item = await this.prisma.paath.findUnique({
      where: { id },
    });
    if (!item || !item.isPublished) {
      throw new NotFoundException("Paath content not found");
    }
    return ApiResponseDto.success(item);
  }

  // ============== ADMIN METHODS ==============

  async adminFindAll(params: {
    templeId?: string;
    category?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { templeId, category, isPublished, page = 1, limit = 50 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (templeId) where.templeId = templeId;
    if (category) where.category = category;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [items, total] = await Promise.all([
      this.prisma.paath.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.paath.count({ where }),
    ]);

    return ApiResponseDto.success(
      { items, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async create(
    dto: CreatePaathDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions to create Paath");
    }

    const item = await this.prisma.paath.create({
      data: {
        templeId: dto.templeId,
        title: dto.title,
        sanskritText: dto.sanskritText,
        transliteration: dto.transliteration,
        hindiMeaning: dto.hindiMeaning,
        englishMeaning: dto.englishMeaning,
        audioUrl: dto.audioUrl,
        durationSeconds: dto.durationSeconds,
        category: dto.category,
        isPublished: dto.isPublished ?? true,
        displayOrder: dto.displayOrder ?? 0,
      },
    });

    return ApiResponseDto.success(item);
  }

  async update(
    id: string,
    dto: UpdatePaathDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions to update Paath");
    }

    const existing = await this.prisma.paath.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Paath content not found");

    const updated = await this.prisma.paath.update({
      where: { id },
      data: dto,
    });

    return ApiResponseDto.success(updated);
  }

  async delete(
    id: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions to delete Paath");
    }

    const existing = await this.prisma.paath.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Paath content not found");

    await this.prisma.paath.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Paath content deleted successfully" });
  }

  async setPublishStatus(
    id: string,
    isPublished: boolean,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.paath.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Paath content not found");

    const updated = await this.prisma.paath.update({
      where: { id },
      data: { isPublished },
    });

    return ApiResponseDto.success(updated);
  }
}
