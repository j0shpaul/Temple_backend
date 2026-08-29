import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { CreateGurukulDto } from "./dto/create-gurukul.dto";
import { UpdateGurukulDto } from "./dto/update-gurukul.dto";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { CreateAdmissionDto } from "./dto/create-admission.dto";
import { UpdateAdmissionDto } from "./dto/update-admission.dto";

@Injectable()
export class GurukulService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  async getGurukul(templeId?: string): Promise<ApiResponseDto<any>> {
    const where: any = { isPublished: true };
    if (templeId) where.templeId = templeId;

    const gurukul = await this.prisma.gurukul.findFirst({
      where,
      include: {
        schedules: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    });

    if (!gurukul) {
      throw new NotFoundException("Gurukul information not found");
    }

    return ApiResponseDto.success(gurukul);
  }

  async getDincharya(gurukulId?: string): Promise<ApiResponseDto<any[]>> {
    const where: any = { isActive: true };
    if (gurukulId) {
      where.gurukulId = gurukulId;
    } else {
      // Find the primary gurukul
      const primary = await this.prisma.gurukul.findFirst({
        where: { isPublished: true },
      });
      if (primary) where.gurukulId = primary.id;
    }

    const schedules = await this.prisma.gurukulSchedule.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });

    return ApiResponseDto.success(schedules);
  }

  async createAdmission(
    dto: CreateAdmissionDto,
  ): Promise<ApiResponseDto<{ id: string; message: string; studentName: string }>> {
    // Resolve gurukulId if not supplied
    let gurukulId = dto.gurukulId;
    if (!gurukulId) {
      const primary = await this.prisma.gurukul.findFirst({
        where: { isPublished: true },
      });
      gurukulId = primary?.id;
    }

    const admission = await this.prisma.gurukulAdmission.create({
      data: {
        gurukulId,
        studentName: dto.studentName,
        guardianName: dto.guardianName,
        phone: dto.phone,
        email: dto.email,
        dateOfBirth: dto.dateOfBirth,
        previousEducation: dto.previousEducation,
        address: dto.address,
        message: dto.message,
        status: "PENDING",
      },
    });

    return ApiResponseDto.success({
      id: admission.id,
      studentName: admission.studentName,
      status: admission.status,
      message: "Admission inquiry submitted successfully. Temple authority will review and contact you.",
    });
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  async adminGetGurukul(id?: string): Promise<ApiResponseDto<any>> {
    const gurukul = id
      ? await this.prisma.gurukul.findUnique({
          where: { id },
          include: {
            schedules: { orderBy: { displayOrder: "asc" } },
            _count: { select: { admissions: true } },
          },
        })
      : await this.prisma.gurukul.findFirst({
          include: {
            schedules: { orderBy: { displayOrder: "asc" } },
            _count: { select: { admissions: true } },
          },
        });

    if (!gurukul) {
      throw new NotFoundException("Gurukul not found");
    }

    return ApiResponseDto.success(gurukul);
  }

  async adminUpdateGurukul(
    id: string,
    dto: UpdateGurukulDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.gurukul.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Gurukul not found");

    const updated = await this.prisma.gurukul.update({
      where: { id },
      data: dto,
    });

    return ApiResponseDto.success(updated);
  }

  async adminGetAdmissions(params: {
    gurukulId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { gurukulId, status, search, page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (gurukulId) where.gurukulId = gurukulId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { studentName: { contains: search, mode: "insensitive" } },
        { guardianName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [admissions, total] = await Promise.all([
      this.prisma.gurukulAdmission.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: { gurukul: { select: { id: true, name: true } } },
      }),
      this.prisma.gurukulAdmission.count({ where }),
    ]);

    return ApiResponseDto.success(
      { admissions, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async adminGetAdmissionById(id: string): Promise<ApiResponseDto<any>> {
    const admission = await this.prisma.gurukulAdmission.findUnique({
      where: { id },
      include: { gurukul: { select: { id: true, name: true } } },
    });
    if (!admission) throw new NotFoundException("Admission inquiry not found");
    return ApiResponseDto.success(admission);
  }

  async adminUpdateAdmission(
    id: string,
    dto: UpdateAdmissionDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.gurukulAdmission.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Admission inquiry not found");

    const updated = await this.prisma.gurukulAdmission.update({
      where: { id },
      data: dto,
    });

    return ApiResponseDto.success(updated);
  }

  async adminCreateSchedule(
    dto: CreateScheduleDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const schedule = await this.prisma.gurukulSchedule.create({
      data: {
        gurukulId: dto.gurukulId,
        activityName: dto.activityName,
        description: dto.description,
        startTime: dto.startTime,
        endTime: dto.endTime,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return ApiResponseDto.success(schedule);
  }

  async adminUpdateSchedule(
    id: string,
    dto: UpdateScheduleDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.gurukulSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Schedule entry not found");

    const updated = await this.prisma.gurukulSchedule.update({
      where: { id },
      data: dto,
    });

    return ApiResponseDto.success(updated);
  }

  async adminDeleteSchedule(
    id: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.gurukulSchedule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Schedule entry not found");

    await this.prisma.gurukulSchedule.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Schedule entry deleted" });
  }
}
