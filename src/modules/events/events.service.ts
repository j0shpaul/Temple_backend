import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(
    templeId: string,
    data: {
      title: string;
      description?: string;
      imageUrl?: string;
      location?: string;
      startDate: string;
      endDate: string;
      capacity?: number;
      registrationRequired?: boolean;
      status?: string;
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

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (endDate < startDate)
      throw new BadRequestException("End date must be after start date");

    const event = await this.prisma.event.create({
      data: {
        templeId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        location: data.location,
        startDate,
        endDate,
        capacity: data.capacity,
        registrationRequired: data.registrationRequired ?? true,
        status: (data.status as any) || "DRAFT",
      },
    });

    return ApiResponseDto.success(event);
  }

  async list(
    templeId: string,
    params?: {
      status?: string;
      upcoming?: boolean;
    },
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (params?.status) where.status = params.status;
    if (params?.upcoming) {
      where.startDate = { gte: TimezoneUtil.startOfDay() };
    }

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { startDate: "asc" },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    const withAvailability = events.map((e) => {
      const regCount = e._count?.registrations ?? e.bookedCount ?? 0;
      return {
        ...e,
        registeredCount: regCount,
        availableSpots: e.capacity ? Math.max(0, e.capacity - regCount) : null,
        isFull: e.capacity ? regCount >= e.capacity : false,
      };
    });

    return ApiResponseDto.success(withAvailability);
  }

  async getById(id: string): Promise<ApiResponseDto<any>> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        temple: { select: { id: true, name: true } },
        registrations: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    return ApiResponseDto.success(event);
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      imageUrl: string;
      location: string;
      startDate: string;
      endDate: string;
      capacity: number;
      registrationRequired: boolean;
      status: string;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (
      updateData.startDate &&
      updateData.endDate &&
      updateData.endDate < updateData.startDate
    ) {
      throw new BadRequestException("End date must be after start date");
    }

    const event = await this.prisma.event.update({
      where: { id },
      data: updateData,
    });
    return ApiResponseDto.success(event);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete event");
    }

    await this.prisma.event.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Event deleted" });
  }

  async register(
    userId: string,
    eventId: string,
  ): Promise<ApiResponseDto<any>> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) throw new NotFoundException("Event not found");
      if (event.status !== "PUBLISHED")
        throw new BadRequestException("Event registration not open");
      if (event.registrationRequired === false)
        throw new BadRequestException("Event does not require registration");

      // Check capacity
      if (event.capacity) {
        const count = await tx.eventRegistration.count({
          where: { eventId, status: "REGISTERED" },
        });
        if (count >= event.capacity)
          throw new ConflictException("Event is full");
      }

      // Check if already registered
      const existing = await tx.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (existing) {
        if (existing.status === "REGISTERED")
          throw new ConflictException("Already registered");
        if (existing.status === "CANCELLED") {
          const qrToken = IdUtil.generateQRToken();
          const updated = await tx.eventRegistration.update({
            where: { id: existing.id },
            data: { status: "REGISTERED", qrToken, cancelledAt: null },
          });
          return ApiResponseDto.success(updated);
        }
      }

      const qrToken = IdUtil.generateQRToken();
      const registration = await tx.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: "REGISTERED",
          qrToken,
        },
        include: {
          event: { select: { title: true, startDate: true, location: true } },
          user: { select: { name: true } },
        },
      });

      await tx.event.update({
        where: { id: eventId },
        data: { bookedCount: { increment: 1 } },
      });

      return ApiResponseDto.success(registration);
    });
  }

  async cancelRegistration(
    userId: string,
    eventId: string,
  ): Promise<ApiResponseDto<any>> {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!registration) throw new NotFoundException("Registration not found");
    if (registration.status === "CANCELLED")
      throw new BadRequestException("Already cancelled");

    await this.prisma.$transaction([
      this.prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      }),
      this.prisma.event.update({
        where: { id: eventId },
        data: { bookedCount: { decrement: 1 } },
      }),
    ]);

    return ApiResponseDto.success({ message: "Registration cancelled" });
  }

  async getMyRegistrations(
    userId: string,
    params: { page?: number; limit?: number },
  ): Promise<ApiResponseDto<any>> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [registrations, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { registeredAt: "desc" },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true,
              imageUrl: true,
            },
          },
        },
      }),
      this.prisma.eventRegistration.count({ where: { userId } }),
    ]);

    return ApiResponseDto.success(
      { registrations, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getEventRegistrations(
    eventId: string,
    params: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { eventId };
    if (status) where.status = status;

    const [registrations, total] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registeredAt: "desc" },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      }),
      this.prisma.eventRegistration.count({ where }),
    ]);

    return ApiResponseDto.success(
      { registrations, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async verifyQrToken(qrToken: string): Promise<ApiResponseDto<any>> {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { qrToken },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
          },
        },
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!registration) {
      return ApiResponseDto.error("INVALID_QR", "Invalid QR code");
    }

    if (registration.status !== "REGISTERED") {
      return ApiResponseDto.error(
        "INVALID_STATUS",
        `Registration status: ${registration.status}`,
      );
    }

    return ApiResponseDto.success({
      registrationId: registration.id,
      event: registration.event,
      user: registration.user,
      registeredAt: registration.registeredAt,
    });
  }
}
