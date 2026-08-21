import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async send(
    userId: string,
    data: {
      type: string;
      title: string;
      body: string;
      data?: any;
      channel?: string;
    },
  ): Promise<ApiResponseDto<any>> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type as any,
        title: data.title,
        body: data.body,
        data: data.data,
        channel: (data.channel as any) || "IN_APP",
        status: "PENDING",
      },
    });

    return ApiResponseDto.success(notification);
  }

  async sendBulk(
    userIds: string[],
    data: {
      type: string;
      title: string;
      body: string;
      data?: any;
      channel?: string;
    },
  ): Promise<ApiResponseDto<{ created: number }>> {
    const notifications = userIds.map((userId) => ({
      userId,
      type: data.type as any,
      title: data.title,
      body: data.body,
      data: data.data,
      channel: (data.channel as any) || "IN_APP",
      status: "PENDING" as any,
    }));

    await this.prisma.notification.createMany({ data: notifications });

    return ApiResponseDto.success({ created: userIds.length });
  }

  async getMyNotifications(
    userId: string,
    params: {
      status?: string;
      type?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { status, type, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return ApiResponseDto.success(
      { notifications, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<ApiResponseDto<any>> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    if (notification.userId !== userId)
      throw new ForbiddenException("Not your notification");

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: "READ", readAt: new Date() },
    });

    return ApiResponseDto.success(updated);
  }

  async markAllAsRead(
    userId: string,
  ): Promise<ApiResponseDto<{ updated: number }>> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, status: { not: "READ" } },
      data: { status: "READ", readAt: new Date() },
    });

    return ApiResponseDto.success({ updated: result.count });
  }

  async getUnreadCount(
    userId: string,
  ): Promise<ApiResponseDto<{ count: number }>> {
    const count = await this.prisma.notification.count({
      where: { userId, status: { not: "READ" } },
    });

    return ApiResponseDto.success({ count });
  }

  // Admin: send notification to user
  async adminSend(
    userId: string,
    data: {
      type: string;
      title: string;
      body: string;
      data?: any;
      channel?: string;
    },
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return this.send(userId, data);
  }

  // Admin: broadcast to all users
  async broadcast(
    data: {
      type: string;
      title: string;
      body: string;
      data?: any;
      channel?: string;
      roleFilter?: string;
    },
    actorRole: string,
  ): Promise<ApiResponseDto<{ created: number }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can broadcast");
    }

    const where: any = { status: "ACTIVE" };
    if (data.roleFilter) where.role = data.roleFilter;

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    return this.sendBulk(
      users.map((u) => u.id),
      data,
    );
  }
}
