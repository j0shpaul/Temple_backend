import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Role, AuditAction } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ============== AUDIT LOGS ==============

  async getAuditLogs(params: {
    actorId?: string;
    action?: string;
    entity?: string;
    entityId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const {
      actorId,
      action,
      entity,
      entityId,
      from,
      to,
      page = 1,
      limit = 50,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return ApiResponseDto.success(
      { logs, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getAuditLogById(id: string): Promise<ApiResponseDto<any>> {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException("Audit log not found");
    return ApiResponseDto.success(log);
  }

  async logAction(data: {
    actorId?: string;
    actorRole?: Role;
    action: AuditAction;
    entity: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
  }): Promise<ApiResponseDto<any>> {
    const log = await this.prisma.auditLog.create({ data });
    return ApiResponseDto.success(log);
  }

  // ============== CROWD STATUS ==============

  async getCrowdStatus(templeId: string): Promise<ApiResponseDto<any>> {
    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) throw new NotFoundException("Temple not found");

    const today = TimezoneUtil.startOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's bookings for darshan, puja, seva
    const [darshanBookings, pujaBookings, sevaBookings, accBookings, events] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            templeId,
            slotDate: { gte: today, lt: tomorrow },
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
        }),
        this.prisma.booking.count({
          where: {
            templeId,
            bookingType: "PUJA",
            slotDate: { gte: today, lt: tomorrow },
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
        }),
        this.prisma.booking.count({
          where: {
            templeId,
            bookingType: "SEVA",
            slotDate: { gte: today, lt: tomorrow },
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
        }),
        this.prisma.accommodationBooking.count({
          where: {
            templeId,
            checkIn: { lte: tomorrow },
            checkOut: { gte: today },
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
          },
        }),
        this.prisma.event.findMany({
          where: {
            templeId,
            startDate: { lt: tomorrow },
            endDate: { gte: today },
            status: "PUBLISHED",
          },
          include: { _count: { select: { registrations: true } } },
        }),
      ]);

    const eventAttendees = events.reduce(
      (sum, e) => sum + e._count.registrations,
      0,
    );

    // Calculate occupancy
    const totalExpected =
      darshanBookings +
      pujaBookings +
      sevaBookings +
      accBookings +
      eventAttendees;

    // Get temple capacity (rough estimate from darshan slots)
    const darshanSlots = await this.prisma.darshanSlot.findMany({
      where: {
        schedule: { templeId },
        date: { gte: today, lt: tomorrow },
        status: "ACTIVE",
      },
      select: { capacity: true },
    });
    const darshanCapacity = darshanSlots.reduce(
      (sum, s) => sum + s.capacity,
      0,
    );

    const rooms = await this.prisma.room.findMany({
      where: { templeId, status: "AVAILABLE" },
      select: { capacity: true },
    });
    const roomCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);

    const totalCapacity = darshanCapacity + roomCapacity;
    const occupancyPct =
      totalCapacity > 0
        ? Math.min(100, Math.round((totalExpected / totalCapacity) * 100))
        : 0;

    let level: string = "LOW";
    if (occupancyPct >= 80) level = "VERY_HIGH";
    else if (occupancyPct >= 60) level = "HIGH";
    else if (occupancyPct >= 40) level = "MODERATE";

    // Store snapshot
    await this.prisma.crowdSnapshot.create({
      data: {
        templeId,
        date: today,
        level: level as any,
        occupancyPct,
        estimatedCount: totalExpected,
        availableCapacity: Math.max(0, totalCapacity - totalExpected),
        source: "computed",
      },
    });

    return ApiResponseDto.success({
      templeId,
      date: today,
      level,
      occupancyPct,
      estimatedCount: totalExpected,
      availableCapacity: Math.max(0, totalCapacity - totalExpected),
      breakdown: {
        darshan: darshanBookings,
        puja: pujaBookings,
        seva: sevaBookings,
        accommodation: accBookings,
        events: eventAttendees,
      },
      capacity: {
        darshan: darshanCapacity,
        rooms: roomCapacity,
        total: totalCapacity,
      },
    });
  }

  async getCrowdHistory(
    templeId: string,
    params: {
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { from, to, page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;

    const where: any = { templeId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [snapshots, total] = await Promise.all([
      this.prisma.crowdSnapshot.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
      this.prisma.crowdSnapshot.count({ where }),
    ]);

    return ApiResponseDto.success(
      { snapshots, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async recordCrowdSnapshot(
    templeId: string,
    data: {
      date?: string;
      level: string;
      occupancyPct: number;
      estimatedCount: number;
      availableCapacity: number;
      source?: string;
    },
  ): Promise<ApiResponseDto<any>> {
    const temple = await this.prisma.temple.findUnique({
      where: { id: templeId },
    });
    if (!temple) throw new NotFoundException("Temple not found");

    const snapshot = await this.prisma.crowdSnapshot.create({
      data: {
        templeId,
        date: data.date ? new Date(data.date) : TimezoneUtil.startOfDay(),
        level: data.level as any,
        occupancyPct: data.occupancyPct,
        estimatedCount: data.estimatedCount,
        availableCapacity: data.availableCapacity,
        source: data.source || "manual",
      },
    });

    return ApiResponseDto.success(snapshot);
  }

  // ============== USER MANAGEMENT ==============

  async listUsers(params: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { role, status, search, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          status: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              bookings: true,
              donations: true,
              eventRegs: true,
              prasadOrders: true,
              accommodations: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return ApiResponseDto.success(
      { users, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getUserById(id: string): Promise<ApiResponseDto<any>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        _count: {
          select: {
            bookings: true,
            donations: true,
            eventRegs: true,
            prasadOrders: true,
            accommodations: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return ApiResponseDto.success(user);
  }

  async updateUserRole(
    id: string,
    role: string,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can change roles");
    }
    if (actorRole === "ADMIN" && role === "SUPER_ADMIN") {
      throw new ForbiddenException("Admins cannot assign SUPER_ADMIN role");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: role as any },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "USER_ROLE_CHANGE",
        entity: "User",
        entityId: id,
        metadata: { newRole: role },
      },
    });

    return ApiResponseDto.success(user);
  }

  async updateUserStatus(
    id: string,
    status: string,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: status as any },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "USER_ROLE_CHANGE",
        entity: "User",
        entityId: id,
        metadata: { newStatus: status },
      },
    });

    return ApiResponseDto.success(user);
  }

  // ============== STATS & REPORTS ==============

  async getDashboardStats(templeId: string): Promise<ApiResponseDto<any>> {
    const today = TimezoneUtil.startOfDay();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisMonth = new Date(today);
    thisMonth.setDate(1);
    const nextMonth = new Date(thisMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [
      totalUsers,
      todayBookings,
      todayRevenue,
      monthBookings,
      monthRevenue,
      pendingPayments,
      activeEvents,
    ] = await Promise.all([
      this.prisma.user.count({ where: { status: "ACTIVE" } }),
      this.prisma.booking.count({
        where: {
          templeId,
          slotDate: { gte: today, lt: tomorrow },
          status: { in: ["CONFIRMED", "CHECKED_IN"] },
        },
      }),
      this.prisma.payment.aggregate({
        where: { paidAt: { gte: today, lt: tomorrow }, status: "SUCCESS" },
        _sum: { amountPaise: true },
      }),
      this.prisma.booking.count({
        where: {
          templeId,
          createdAt: { gte: thisMonth, lt: nextMonth },
          status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        },
      }),
      this.prisma.payment.aggregate({
        where: { paidAt: { gte: thisMonth, lt: nextMonth }, status: "SUCCESS" },
        _sum: { amountPaise: true },
      }),
      this.prisma.payment.count({ where: { status: "PENDING" } }),
      this.prisma.event.count({
        where: { templeId, status: "PUBLISHED", endDate: { gte: today } },
      }),
    ]);

    return ApiResponseDto.success({
      users: { total: totalUsers },
      today: {
        bookings: todayBookings,
        revenuePaise: todayRevenue._sum.amountPaise || 0,
      },
      month: {
        bookings: monthBookings,
        revenuePaise: monthRevenue._sum.amountPaise || 0,
      },
      pendingPayments,
      activeEvents,
    });
  }

  async getRevenueReport(
    templeId: string,
    params: {
      from: string;
      to: string;
      groupBy?: "day" | "week" | "month";
    },
  ): Promise<ApiResponseDto<any>> {
    const { from, to, groupBy = "day" } = params;

    const payments = await this.prisma.payment.findMany({
      where: {
        status: "SUCCESS",
        paidAt: { gte: new Date(from), lte: new Date(to) },
        // Filter by temple through related entities
        OR: [
          { booking: { templeId } },
          { donation: { templeId } },
          { prasadOrder: { templeId } },
          { accommodation: { templeId } },
        ],
      },
      include: {
        booking: { select: { templeId: true } },
        donation: { select: { templeId: true } },
        prasadOrder: { select: { templeId: true } },
        accommodation: { select: { templeId: true } },
      },
    });

    const filtered = payments.filter(
      (p) =>
        p.booking?.templeId === templeId ||
        p.donation?.templeId === templeId ||
        p.prasadOrder?.templeId === templeId ||
        p.accommodation?.templeId === templeId,
    );

    const grouped: Record<string, { total: number; count: number }> = {};

    for (const p of filtered) {
      const date = p.paidAt ? new Date(p.paidAt) : new Date(p.createdAt);
      let key: string;
      if (groupBy === "day") key = date.toISOString().split("T")[0];
      else if (groupBy === "week") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
      grouped[key].total += p.amountPaise;
      grouped[key].count += 1;
    }

    const report = Object.entries(grouped)
      .map(([period, data]) => ({
        period,
        totalPaise: data.total,
        count: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return ApiResponseDto.success(report);
  }
}
