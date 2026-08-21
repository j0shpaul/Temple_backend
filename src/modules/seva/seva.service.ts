import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class SevaService {
  constructor(private prisma: PrismaService) {}

  async create(
    templeId: string,
    data: {
      name: string;
      description?: string;
      deityId?: string;
      pricePaise: number;
      durationMinutes?: number;
      defaultCapacity?: number;
      isActive?: boolean;
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

    if (data.deityId) {
      const deity = await this.prisma.deity.findUnique({
        where: { id: data.deityId },
      });
      if (!deity || deity.templeId !== templeId)
        throw new NotFoundException("Deity not found in this temple");
    }

    const seva = await this.prisma.seva.create({
      data: {
        templeId,
        deityId: data.deityId,
        name: data.name,
        description: data.description,
        pricePaise: data.pricePaise,
        durationMinutes: data.durationMinutes ?? 30,
        defaultCapacity: data.defaultCapacity ?? 1,
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    return ApiResponseDto.success(seva);
  }

  async findByTemple(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const sevas = await this.prisma.seva.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: { deity: { select: { id: true, name: true } } },
    });

    return ApiResponseDto.success(sevas);
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const seva = await this.prisma.seva.findUnique({
      where: { id },
      include: {
        deity: { select: { id: true, name: true } },
        slots: { orderBy: { date: "asc" } },
      },
    });
    if (!seva) throw new NotFoundException("Seva not found");
    return ApiResponseDto.success(seva);
  }

  async getSlots(
    templeId: string,
    params: {
      date?: string;
      sevaId?: string;
      status?: "ACTIVE" | "INACTIVE";
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { date, sevaId, status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { status: status || "ACTIVE" };
    if (date) {
      const targetDate = TimezoneUtil.parseTempleDate(date);
      where.date = targetDate;
    }
    if (sevaId) where.sevaId = sevaId;

    let sevaIds = [sevaId];
    if (!sevaId && templeId) {
      const sevas = await this.prisma.seva.findMany({
        where: { templeId, isActive: true },
        select: { id: true },
      });
      sevaIds = sevas.map((s) => s.id);
      where.sevaId = { in: sevaIds };
    }

    const [slots, total] = await Promise.all([
      this.prisma.sevaSlot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "asc" },
        include: {
          seva: {
            select: { name: true, durationMinutes: true, pricePaise: true },
          },
        },
      }),
      this.prisma.sevaSlot.count({ where }),
    ]);

    const slotsWithAvail = slots.map((s) => ({
      ...s,
      availableCapacity: s.capacity - s.bookedCount,
      isFull: s.bookedCount >= s.capacity,
    }));

    return ApiResponseDto.success(
      { slots: slotsWithAvail, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getAvailability(
    templeId: string,
    date: string,
  ): Promise<ApiResponseDto<any>> {
    const targetDate = TimezoneUtil.parseTempleDate(date);
    const sevas = await this.prisma.seva.findMany({
      where: { templeId, isActive: true },
      include: {
        slots: {
          where: { date: targetDate, status: "ACTIVE" },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            capacity: true,
            bookedCount: true,
          },
        },
      },
    });

    const result = sevas.map((s) => ({
      sevaId: s.id,
      sevaName: s.name,
      pricePaise: s.pricePaise,
      durationMinutes: s.durationMinutes,
      slots: s.slots.map((slot) => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
        availableCapacity: slot.capacity - slot.bookedCount,
        isFull: slot.bookedCount >= slot.capacity,
      })),
    }));

    return ApiResponseDto.success(result);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      deityId: string;
      pricePaise: number;
      durationMinutes: number;
      defaultCapacity: number;
      isActive: boolean;
      displayOrder: number;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    if (data.deityId) {
      const deity = await this.prisma.deity.findUnique({
        where: { id: data.deityId },
      });
      if (!deity) throw new NotFoundException("Deity not found");
    }

    const seva = await this.prisma.seva.update({ where: { id }, data });
    return ApiResponseDto.success(seva);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete seva");
    }

    await this.prisma.seva.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Seva deleted" });
  }

  async createSlot(
    sevaId: string,
    data: {
      date: string;
      startTime: string;
      endTime: string;
      capacity: number;
      status?: "ACTIVE" | "INACTIVE";
    },
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const seva = await this.prisma.seva.findUnique({ where: { id: sevaId } });
    if (!seva) throw new NotFoundException("Seva not found");

    const targetDate = TimezoneUtil.parseTempleDate(data.date);
    const [startH, startM] = data.startTime.split(":").map(Number);
    const [endH, endM] = data.endTime.split(":").map(Number);

    const startTime = new Date(targetDate);
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endH, endM, 0, 0);

    const slot = await this.prisma.sevaSlot.create({
      data: {
        sevaId,
        date: targetDate,
        startTime,
        endTime,
        capacity: data.capacity,
        status: data.status || "ACTIVE",
      },
    });

    return ApiResponseDto.success(slot);
  }

  async updateSlot(
    id: string,
    data: { capacity?: number; status?: "ACTIVE" | "INACTIVE" },
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const slot = await this.prisma.sevaSlot.update({ where: { id }, data });
    return ApiResponseDto.success(slot);
  }
}
