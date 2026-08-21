import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class AartiService {
  constructor(private prisma: PrismaService) {}

  async create(
    templeId: string,
    data: {
      name: string;
      description?: string;
      dayOfWeek?: number; // 0=Sun..6=Sat, null=daily
      specificDate?: string;
      startTime: string; // "HH:mm" IST
      endTime: string;
      isSpecial?: boolean;
      overrideReason?: string;
      displayOrder?: number;
    },
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) throw new NotFoundException("Temple not found");

    if (
      data.dayOfWeek !== undefined &&
      (data.dayOfWeek < 0 || data.dayOfWeek > 6)
    ) {
      throw new Error("dayOfWeek must be 0-6");
    }

    const aarti = await this.prisma.aartiSchedule.create({
      data: {
        templeId,
        name: data.name,
        description: data.description,
        dayOfWeek: data.dayOfWeek ?? null,
        specificDate: data.specificDate ? new Date(data.specificDate) : null,
        startTime: data.startTime,
        endTime: data.endTime,
        isSpecial: data.isSpecial ?? false,
        overrideReason: data.overrideReason,
        displayOrder: data.displayOrder ?? 0,
        status: "ACTIVE",
      },
    });

    return ApiResponseDto.success(aarti);
  }

  async findByTemple(
    templeId: string,
    status?: "ACTIVE" | "INACTIVE",
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (status) where.status = status;

    const aartis = await this.prisma.aartiSchedule.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });

    return ApiResponseDto.success(aartis);
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const aarti = await this.prisma.aartiSchedule.findUnique({ where: { id } });
    if (!aarti) throw new NotFoundException("Aarti schedule not found");
    return ApiResponseDto.success(aarti);
  }

  async getTodaySchedule(templeId: string): Promise<ApiResponseDto<any[]>> {
    const today = TimezoneUtil.startOfDay();
    const dayOfWeek = today.getDay();

    const aartis = await this.prisma.aartiSchedule.findMany({
      where: {
        templeId,
        status: "ACTIVE",
        OR: [
          { dayOfWeek: dayOfWeek },
          { dayOfWeek: null },
          { specificDate: today },
        ],
      },
      orderBy: { startTime: "asc" },
    });

    return ApiResponseDto.success(aartis);
  }

  async getUpcoming(
    templeId: string,
    days: number = 7,
  ): Promise<ApiResponseDto<any[]>> {
    const today = TimezoneUtil.startOfDay();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + days);

    const aartis = await this.prisma.aartiSchedule.findMany({
      where: {
        templeId,
        status: "ACTIVE",
        OR: [
          { dayOfWeek: { not: null } },
          { specificDate: { gte: today, lte: endDate } },
        ],
      },
      orderBy: [
        { specificDate: "asc" },
        { dayOfWeek: "asc" },
        { startTime: "asc" },
      ],
      take: 50,
    });

    return ApiResponseDto.success(aartis);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      dayOfWeek: number;
      specificDate: string;
      startTime: string;
      endTime: string;
      isSpecial: boolean;
      overrideReason: string;
      status: "ACTIVE" | "INACTIVE";
      displayOrder: number;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const aarti = await this.prisma.aartiSchedule.update({
      where: { id },
      data: {
        ...data,
        specificDate: data.specificDate
          ? new Date(data.specificDate)
          : undefined,
        dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : undefined,
      },
    });

    return ApiResponseDto.success(aarti);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete aarti schedule");
    }

    await this.prisma.aartiSchedule.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Aarti schedule deleted" });
  }
}
