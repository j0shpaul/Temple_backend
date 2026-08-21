import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class DeityService {
  constructor(private prisma: PrismaService) {}

  async create(
    templeId: string,
    data: {
      name: string;
      description?: string;
      significance?: string;
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

    const deity = await this.prisma.deity.create({
      data: {
        templeId,
        name: data.name,
        description: data.description,
        significance: data.significance,
        displayOrder: data.displayOrder || 0,
        isActive: data.isActive ?? true,
      },
    });

    return ApiResponseDto.success(deity);
  }

  async findByTemple(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const deities = await this.prisma.deity.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        pujas: { where: { isActive: true } },
        sevas: { where: { isActive: true } },
      },
    });

    return ApiResponseDto.success(deities);
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const deity = await this.prisma.deity.findUnique({
      where: { id },
      include: {
        temple: true,
        pujas: { where: { isActive: true }, include: { slots: true } },
        sevas: { where: { isActive: true }, include: { slots: true } },
      },
    });

    if (!deity) {
      throw new NotFoundException("Deity not found");
    }

    return ApiResponseDto.success(deity);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      significance: string;
      displayOrder: number;
      isActive: boolean;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const deity = await this.prisma.deity.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(deity);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete deity");
    }

    await this.prisma.deity.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Deity deleted" });
  }
}
