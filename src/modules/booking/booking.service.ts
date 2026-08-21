import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async createPujaBooking(
    userId: string,
    data: {
      templeId: string;
      pujaId: string;
      slotId: string;
      quantity: number;
      devoteeName: string;
      devoteePhone: string;
      devoteeEmail?: string;
      attendees?: {
        name: string;
        phone?: string;
        email?: string;
        age?: number;
      }[];
    },
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.pujaSlot.findUnique({
        where: { id: data.slotId },
        include: { puja: true },
      });
      if (!slot) throw new NotFoundException("Puja slot not found");
      if (slot.puja.templeId !== data.templeId)
        throw new ForbiddenException("Slot does not belong to this temple");
      if (slot.status !== "ACTIVE")
        throw new ConflictException("Slot is not active");

      // Atomically check and increment bookedCount
      const updateResult = await tx.pujaSlot.updateMany({
        where: {
          id: data.slotId,
          status: "ACTIVE",
          bookedCount: { lte: slot.capacity - data.quantity },
        },
        data: { bookedCount: { increment: data.quantity } },
      });

      if (updateResult.count === 0) {
        throw new ConflictException("Not enough capacity in this slot");
      }

      // Create booking with PENDING_PAYMENT status
      const reference = IdUtil.generateBookingReference("PJ");
      const createdBooking = await tx.booking.create({
        data: {
          userId,
          templeId: data.templeId,
          bookingType: "PUJA",
          entityId: data.pujaId,
          slotId: data.slotId,
          slotDate: slot.date,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
          quantity: data.quantity,
          devoteeName: data.devoteeName,
          devoteePhone: data.devoteePhone,
          devoteeEmail: data.devoteeEmail,
          amountPaise: slot.puja.pricePaise * data.quantity,
          status: "PENDING_PAYMENT",
          reference,
          attendees: data.attendees ? { create: data.attendees } : undefined,
        },
        include: { attendees: true },
      });

      return createdBooking;
    });

    return ApiResponseDto.success(booking);
  }

  async createSevaBooking(
    userId: string,
    data: {
      templeId: string;
      sevaId: string;
      slotId: string;
      quantity: number;
      devoteeName: string;
      devoteePhone: string;
      devoteeEmail?: string;
      attendees?: {
        name: string;
        phone?: string;
        email?: string;
        age?: number;
      }[];
    },
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.sevaSlot.findUnique({
        where: { id: data.slotId },
        include: { seva: true },
      });
      if (!slot) throw new NotFoundException("Seva slot not found");
      if (slot.seva.templeId !== data.templeId)
        throw new ForbiddenException("Slot does not belong to this temple");
      if (slot.status !== "ACTIVE")
        throw new ConflictException("Slot is not active");

      // Atomically check and increment bookedCount
      const updateResult = await tx.sevaSlot.updateMany({
        where: {
          id: data.slotId,
          status: "ACTIVE",
          bookedCount: { lte: slot.capacity - data.quantity },
        },
        data: { bookedCount: { increment: data.quantity } },
      });

      if (updateResult.count === 0) {
        throw new ConflictException("Not enough capacity in this slot");
      }

      const reference = IdUtil.generateBookingReference("SV");
      const createdBooking = await tx.booking.create({
        data: {
          userId,
          templeId: data.templeId,
          bookingType: "SEVA",
          entityId: data.sevaId,
          slotId: data.slotId,
          slotDate: slot.date,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
          quantity: data.quantity,
          devoteeName: data.devoteeName,
          devoteePhone: data.devoteePhone,
          devoteeEmail: data.devoteeEmail,
          amountPaise: slot.seva.pricePaise * data.quantity,
          status: "PENDING_PAYMENT",
          reference,
          attendees: data.attendees ? { create: data.attendees } : undefined,
        },
        include: { attendees: true },
      });

      return createdBooking;
    });

    return ApiResponseDto.success(booking);
  }

  async createDarshanBooking(
    userId: string,
    data: {
      templeId: string;
      scheduleId: string;
      slotId: string;
      quantity: number;
      devoteeName: string;
      devoteePhone: string;
      devoteeEmail?: string;
      attendees?: {
        name: string;
        phone?: string;
        email?: string;
        age?: number;
      }[];
    },
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.darshanSlot.findUnique({
        where: { id: data.slotId },
        include: { schedule: true },
      });
      if (!slot) throw new NotFoundException("Darshan slot not found");
      if (slot.schedule.templeId !== data.templeId)
        throw new ForbiddenException("Slot does not belong to this temple");
      if (slot.status !== "ACTIVE")
        throw new ConflictException("Slot is not active");

      // Atomically check and increment bookedCount
      const updateResult = await tx.darshanSlot.updateMany({
        where: {
          id: data.slotId,
          status: "ACTIVE",
          bookedCount: { lte: slot.capacity - data.quantity },
        },
        data: { bookedCount: { increment: data.quantity } },
      });

      if (updateResult.count === 0) {
        throw new ConflictException("Not enough capacity in this slot");
      }

      const reference = IdUtil.generateBookingReference("DS");
      const qrToken = IdUtil.generateQRToken();
      const createdBooking = await tx.booking.create({
        data: {
          userId,
          templeId: data.templeId,
          bookingType: "DARSHAN",
          entityId: data.scheduleId,
          slotId: data.slotId,
          slotDate: slot.date,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
          quantity: data.quantity,
          devoteeName: data.devoteeName,
          devoteePhone: data.devoteePhone,
          devoteeEmail: data.devoteeEmail,
          amountPaise: 0,
          status: "CONFIRMED",
          reference,
          qrToken,
          qrGeneratedAt: new Date(),
          attendees: data.attendees ? { create: data.attendees } : undefined,
        },
        include: { attendees: true },
      });

      return createdBooking;
    });

    return ApiResponseDto.success(booking);
  }

  async getById(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        attendees: true,
        payment: true,
        temple: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    if (
      userId &&
      userRole &&
      booking.userId !== userId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
    ) {
      throw new ForbiddenException("Cannot access another user's booking");
    }

    return ApiResponseDto.success(booking);
  }

  async getByReference(reference: string): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
      include: {
        attendees: true,
        payment: true,
        temple: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    return ApiResponseDto.success(booking);
  }

  async getUserBookings(
    userId: string,
    params: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payment: {
            select: { id: true, status: true, razorpayOrderId: true },
          },
          temple: { select: { id: true, name: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return ApiResponseDto.success(
      { bookings, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getTempleBookings(
    templeId: string,
    params: {
      status?: string;
      bookingType?: string;
      date?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { status, bookingType, date, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { templeId };
    if (status) where.status = status;
    if (bookingType) where.bookingType = bookingType;
    if (date) {
      const targetDate = TimezoneUtil.parseTempleDate(date);
      where.slotDate = targetDate;
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payment: { select: { id: true, status: true } },
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return ApiResponseDto.success(
      { bookings, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async cancelBooking(
    id: string,
    userId: string,
    reason: string,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException("Booking not found");

      // Authorization: user can cancel own booking, staff+ can cancel any
      if (
        existing.userId !== userId &&
        !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)
      ) {
        throw new ForbiddenException("Cannot cancel this booking");
      }

      // Cannot cancel already cancelled or completed
      if (["CANCELLED", "COMPLETED", "CHECKED_IN"].includes(existing.status)) {
        throw new ConflictException(
          "Booking cannot be cancelled in current state",
        );
      }

      // Decrement slot bookedCount
      if (existing.bookingType === "PUJA") {
        await tx.pujaSlot.update({
          where: { id: existing.slotId },
          data: { bookedCount: { decrement: existing.quantity } },
        });
      } else if (existing.bookingType === "SEVA") {
        await tx.sevaSlot.update({
          where: { id: existing.slotId },
          data: { bookedCount: { decrement: existing.quantity } },
        });
      } else if (existing.bookingType === "DARSHAN") {
        await tx.darshanSlot.update({
          where: { id: existing.slotId },
          data: { bookedCount: { decrement: existing.quantity } },
        });
      }

      const cancelled = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledReason: reason,
        },
        include: { payment: true, attendees: true },
      });

      return cancelled;
    });

    return ApiResponseDto.success(booking);
  }

  async markCheckedIn(
    id: string,
    templeId: string,
    verifiedBy: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException("Booking not found");
      if (existing.templeId !== templeId)
        throw new ForbiddenException("Booking does not belong to this temple");
      if (
        existing.status !== "CONFIRMED" &&
        existing.status !== "PENDING_PAYMENT"
      ) {
        throw new ConflictException("Booking cannot be checked in");
      }

      // Generate QR token if not exists
      const qrToken = existing.qrToken || IdUtil.generateQRToken();

      const checkedIn = await tx.booking.update({
        where: { id },
        data: {
          status: "CHECKED_IN",
          checkedInAt: new Date(),
          qrToken,
          qrGeneratedAt: new Date(),
        },
      });

      // Create check-in record
      await tx.checkIn.create({
        data: {
          bookingId: id,
          userId: existing.userId,
          templeId,
          location: "temple_entrance",
          verifiedBy,
        },
      });

      return checkedIn;
    });

    return ApiResponseDto.success(booking);
  }

  async verifyQrToken(qrToken: string): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.booking.findUnique({
      where: { qrToken },
      include: {
        temple: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true } },
        attendees: true,
      },
    });

    if (!booking) {
      return ApiResponseDto.error("INVALID_QR", "Invalid QR code");
    }

    if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
      return ApiResponseDto.error(
        "INVALID_STATUS",
        `Booking status: ${booking.status}`,
      );
    }

    return ApiResponseDto.success({
      bookingId: booking.id,
      reference: booking.reference,
      type: booking.bookingType,
      devoteeName: booking.devoteeName,
      slotStartTime: booking.slotStartTime,
      slotEndTime: booking.slotEndTime,
      quantity: booking.quantity,
      attendees: booking.attendees,
    });
  }
}
