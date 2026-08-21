import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class PujaService {
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

    const puja = await this.prisma.puja.create({
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

    return ApiResponseDto.success(puja);
  }

  async findByTemple(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const pujas = await this.prisma.puja.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: { deity: { select: { id: true, name: true } } },
    });

    return ApiResponseDto.success(pujas);
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const puja = await this.prisma.puja.findUnique({
      where: { id },
      include: {
        deity: { select: { id: true, name: true } },
        slots: { orderBy: { date: "asc" } },
      },
    });
    if (!puja) throw new NotFoundException("Puja service not found");
    return ApiResponseDto.success(puja);
  }

  async getSlots(
    templeId: string,
    params: {
      date?: string;
      pujaId?: string;
      status?: "ACTIVE" | "INACTIVE";
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { date, pujaId, status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { status: status || "ACTIVE" };
    if (date) {
      const targetDate = TimezoneUtil.parseTempleDate(date);
      where.date = targetDate;
    }
    if (pujaId) where.pujaId = pujaId;

    let pujaIds = [pujaId];
    if (!pujaId && templeId) {
      const pujas = await this.prisma.puja.findMany({
        where: { templeId, isActive: true },
        select: { id: true },
      });
      pujaIds = pujas.map((p) => p.id);
      where.pujaId = { in: pujaIds };
    }

    const [slots, total] = await Promise.all([
      this.prisma.pujaSlot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "asc" },
        include: {
          puja: {
            select: { name: true, durationMinutes: true, pricePaise: true },
          },
        },
      }),
      this.prisma.pujaSlot.count({ where }),
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
    const pujas = await this.prisma.puja.findMany({
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

    const result = pujas.map((p) => ({
      pujaId: p.id,
      pujaName: p.name,
      pricePaise: p.pricePaise,
      durationMinutes: p.durationMinutes,
      slots: p.slots.map((slot) => ({
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

    const puja = await this.prisma.puja.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(puja);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete puja service");
    }

    await this.prisma.puja.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Puja service deleted" });
  }

  async createSlot(
    pujaId: string,
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

    const puja = await this.prisma.puja.findUnique({ where: { id: pujaId } });
    if (!puja) throw new NotFoundException("Puja service not found");

    const targetDate = TimezoneUtil.parseTempleDate(data.date);
    const [startH, startM] = data.startTime.split(":").map(Number);
    const [endH, endM] = data.endTime.split(":").map(Number);

    const startTime = new Date(targetDate);
    startTime.setHours(startH, startM, 0, 0);

    const endTime = new Date(targetDate);
    endTime.setHours(endH, endM, 0, 0);

    const slot = await this.prisma.pujaSlot.create({
      data: {
        pujaId,
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

    const slot = await this.prisma.pujaSlot.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(slot);
  }
}
