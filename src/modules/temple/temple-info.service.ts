import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class TempleInfoService {
  constructor(private prisma: PrismaService) {}

  async create(
    templeId: string,
    data: {
      history?: string;
      architecture?: string;
      timings?: string;
      guidelines?: string;
      about?: string;
    },
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) {
      throw new NotFoundException("Temple not found");
    }

    // TempleInformation has a 1:1 relation with Temple, so upsert.
    const info = await this.prisma.templeInformation.upsert({
      where: { templeId },
      create: { templeId, ...data },
      update: { ...data },
    });

    return ApiResponseDto.success(info);
  }

  async findByTemple(templeId: string): Promise<ApiResponseDto<any>> {
    const info = await this.prisma.templeInformation.findUnique({
      where: { templeId },
    });
    if (!info) {
      throw new NotFoundException("Temple information not found");
    }
    return ApiResponseDto.success(info);
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const info = await this.prisma.templeInformation.findUnique({
      where: { id },
    });
    if (!info) {
      throw new NotFoundException("Temple information not found");
    }
    return ApiResponseDto.success(info);
  }

  async update(
    id: string,
    data: Partial<{
      history: string;
      architecture: string;
      timings: string;
      guidelines: string;
      about: string;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const info = await this.prisma.templeInformation.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(info);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete temple info");
    }

    await this.prisma.templeInformation.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Temple information deleted" });
  }
}
