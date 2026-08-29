import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class DarshanService {
  constructor(private prisma: PrismaService) {}

  async createSchedule(
    templeId: string,
    data: {
      name: string;
      description?: string;
      dayOfWeek?: number; // 0=Sun..6=Sat, null=daily
      specificDate?: string; // ISO date string
      startTime: string; // "HH:mm" format in IST
      endTime: string;
      maxCapacity: number;
      isSpecial?: boolean;
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
      throw new ConflictException("dayOfWeek must be 0-6");
    }

    const schedule = await this.prisma.darshanSchedule.create({
      data: {
        templeId,
        name: data.name,
        description: data.description,
        dayOfWeek: data.dayOfWeek ?? null,
        specificDate: data.specificDate ? new Date(data.specificDate) : null,
        startTime: data.startTime,
        endTime: data.endTime,
        maxCapacity: data.maxCapacity,
        isSpecial: data.isSpecial ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    // Auto-generate slots for the next 30 days
    await this.generateSlotsForSchedule(schedule.id, 30);

    return ApiResponseDto.success(schedule);
  }

  async generateSlotsForSchedule(
    scheduleId: string,
    days: number = 30,
  ): Promise<void> {
    const schedule = await this.prisma.darshanSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) return;

    const today = TimezoneUtil.startOfDay();
    const slotsToCreate: Prisma.DarshanSlotCreateManyInput[] = [];

    for (let i = 0; i < days; i++) {
      const slotDate = new Date(today);
      slotDate.setDate(today.getDate() + i);

      const dayOfWeek = slotDate.getDay();
      if (schedule.dayOfWeek !== null && schedule.dayOfWeek !== dayOfWeek)
        continue;
      if (
        schedule.specificDate &&
        !TimezoneUtil.isSameTempleDay(schedule.specificDate, slotDate)
      )
        continue;

      // Parse start/end time strings (e.g., "06:00") to DateTime for the slot
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      const [endH, endM] = schedule.endTime.split(":").map(Number);

      const startTime = new Date(slotDate);
      startTime.setHours(startH, startM, 0, 0);

      const endTime = new Date(slotDate);
      endTime.setHours(endH, endM, 0, 0);

      slotsToCreate.push({
        scheduleId,
        date: slotDate,
        startTime,
        endTime,
        capacity: schedule.maxCapacity,
        status: "ACTIVE",
      });
    }

    if (slotsToCreate.length > 0) {
      await this.prisma.darshanSlot.createMany({
        data: slotsToCreate,
        skipDuplicates: true,
      });
    }
  }

  async getSchedules(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const schedules = await this.prisma.darshanSchedule.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        slots: {
          where: { status: "ACTIVE" },
          orderBy: { date: "asc" },
          take: 60,
        },
      },
    });

    return ApiResponseDto.success(schedules);
  }

  async getScheduleById(id: string): Promise<ApiResponseDto<any>> {
    const schedule = await this.prisma.darshanSchedule.findUnique({
      where: { id },
      include: { slots: { orderBy: { date: "asc" } } },
    });
    if (!schedule) throw new NotFoundException("Darshan schedule not found");
    return ApiResponseDto.success(schedule);
  }

  async getSlots(
    templeId: string,
    params: {
      date?: string;
      scheduleId?: string;
      status?: "ACTIVE" | "INACTIVE";
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { date, scheduleId, status, page = 1, limit = 50 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: status || "ACTIVE" };
    if (date) {
      const targetDate = TimezoneUtil.parseTempleDate(date);
      where.date = targetDate;
    }
    if (scheduleId) where.scheduleId = scheduleId;

    // If templeId provided but no scheduleId, get schedules for this temple first
    let scheduleIds = [scheduleId];
    if (!scheduleId && templeId) {
      const schedules = await this.prisma.darshanSchedule.findMany({
        where: { templeId, isActive: true },
        select: { id: true },
      });
      scheduleIds = schedules.map((s) => s.id);
      where.scheduleId = { in: scheduleIds };
    }

    const [slots, total] = await Promise.all([
      this.prisma.darshanSlot.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { date: "asc" },
        include: {
          schedule: { select: { name: true, startTime: true, endTime: true } },
        },
      }),
      this.prisma.darshanSlot.count({ where }),
    ]);

    // Add available capacity
    const slotsWithAvail = slots.map((s) => ({
      ...s,
      availableCapacity: s.capacity - s.bookedCount,
      isFull: s.bookedCount >= s.capacity,
    }));

    return ApiResponseDto.success(
      { slots: slotsWithAvail, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async updateSchedule(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      dayOfWeek: number;
      specificDate: string;
      startTime: string;
      endTime: string;
      maxCapacity: number;
      isSpecial: boolean;
      isActive: boolean;
      displayOrder: number;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const schedule = await this.prisma.darshanSchedule.update({
      where: { id },
      data: {
        ...data,
        specificDate: data.specificDate
          ? new Date(data.specificDate)
          : undefined,
        dayOfWeek: data.dayOfWeek !== undefined ? data.dayOfWeek : undefined,
      },
    });

    // If timing/capacity changed, regenerate future slots
    if (
      data.startTime ||
      data.endTime ||
      data.maxCapacity ||
      data.isActive === false
    ) {
      await this.regenerateFutureSlots(schedule.id);
    }

    return ApiResponseDto.success(schedule);
  }

  async updateSlot(
    id: string,
    data: { capacity?: number; status?: "ACTIVE" | "INACTIVE" },
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const slot = await this.prisma.darshanSlot.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(slot);
  }

  async deleteSchedule(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete schedule");
    }

    await this.prisma.darshanSchedule.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Darshan schedule deleted" });
  }

  private async regenerateFutureSlots(scheduleId: string): Promise<void> {
    const today = TimezoneUtil.startOfDay();
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 30);

    // Deactivate future slots
    await this.prisma.darshanSlot.updateMany({
      where: { scheduleId, date: { gte: today }, status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });

    // Regenerate
    await this.generateSlotsForSchedule(scheduleId, 30);
  }

  async getAvailability(
    templeId: string,
    date: string,
  ): Promise<ApiResponseDto<any>> {
    const targetDate = TimezoneUtil.parseTempleDate(date);
    const schedules = await this.prisma.darshanSchedule.findMany({
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

    const result = schedules.map((s) => ({
      scheduleId: s.id,
      scheduleName: s.name,
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
}
