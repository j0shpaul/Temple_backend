import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { NotificationsService } from "./notifications.service";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class AnnouncementService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    templeId: string,
    data: {
      title: string;
      message: string;
      priority?: string;
      status?: string;
      startsAt?: string;
      endsAt?: string;
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

    const announcement = await this.prisma.announcement.create({
      data: {
        templeId,
        title: data.title,
        message: data.message,
        priority: (data.priority as any) || "NORMAL",
        status: (data.status as any) || "DRAFT",
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
      },
    });

    return ApiResponseDto.success(announcement);
  }

  async list(
    templeId: string,
    params?: {
      status?: string;
      priority?: string;
      active?: boolean;
    },
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (params?.status) where.status = params.status;
    if (params?.priority) where.priority = params.priority;

    if (params?.active) {
      where.status = "PUBLISHED";
      const now = TimezoneUtil.now();
      where.OR = [
        { startsAt: null, endsAt: null },
        { startsAt: { lte: now }, endsAt: { gte: now } },
        { startsAt: null, endsAt: { gte: now } },
        { startsAt: { lte: now }, endsAt: null },
      ];
    }

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return ApiResponseDto.success(announcements);
  }

  async getById(id: string): Promise<ApiResponseDto<any>> {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id },
    });
    if (!announcement) throw new NotFoundException("Announcement not found");
    return ApiResponseDto.success(announcement);
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      message: string;
      priority: string;
      status: string;
      startsAt: string;
      endsAt: string;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const updateData: any = { ...data };
    if (data.startsAt !== undefined)
      updateData.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined)
      updateData.endsAt = data.endsAt ? new Date(data.endsAt) : null;

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    return ApiResponseDto.success(announcement);
  }

  async publish(id: string, actorRole: string): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    return ApiResponseDto.success(announcement);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete announcement");
    }

    await this.prisma.announcement.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Announcement deleted" });
  }

  // Notify all users of temple about published announcement
  async notifyTempleUsers(
    templeId: string,
    announcementId: string,
  ): Promise<ApiResponseDto<{ created: number }>> {
    const users = await this.prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    return this.notificationsService.sendBulk(
      users.map((u) => u.id),
      {
        type: "ANNOUNCEMENT",
        title: "New Announcement",
        body: "Check out the latest announcement from the temple.",
        data: { announcementId },
      },
    );
  }
}
