import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CashfreeService } from "../payments/cashfree.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { IdUtil } from "../../common/utils/id.util";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { CreateMahaprasadSlotDto } from "./dto/create-slot.dto";
import { UpdateMahaprasadSlotDto } from "./dto/update-slot.dto";
import { BookMahaprasadDto } from "./dto/book-mahaprasad.dto";

@Injectable()
export class MahaprasadService {
  constructor(
    private prisma: PrismaService,
    private cashfree: CashfreeService,
  ) {}

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  async listSlots(params: {
    templeId?: string;
    date?: string;
  }): Promise<ApiResponseDto<any[]>> {
    const where: any = { isActive: true };
    if (params.templeId) where.templeId = params.templeId;
    if (params.date) {
      const targetDate = TimezoneUtil.parseTempleDate(params.date);
      where.date = targetDate;
    } else {
      // Default to today and future
      where.date = { gte: TimezoneUtil.startOfDay() };
    }

    const slots = await this.prisma.mahaprasadSlot.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const enriched = slots.map((s) => ({
      ...s,
      availableCapacity: Math.max(0, s.capacity - s.bookedCount),
      isFull: s.bookedCount >= s.capacity,
    }));

    return ApiResponseDto.success(enriched);
  }

  async bookSlot(
    dto: BookMahaprasadDto,
    userId?: string,
  ): Promise<ApiResponseDto<any>> {
    if (dto.numberOfPeople <= 0) {
      throw new BadRequestException("Number of people must be at least 1");
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      const slot = await tx.mahaprasadSlot.findUnique({
        where: { id: dto.slotId },
      });
      if (!slot) throw new NotFoundException("Mahaprasad slot not found");
      if (!slot.isActive) {
        throw new ConflictException("Mahaprasad slot is not active");
      }

      // 1. Atomic capacity check and booking count increment
      const updateResult = await tx.mahaprasadSlot.updateMany({
        where: {
          id: dto.slotId,
          isActive: true,
          bookedCount: { lte: slot.capacity - dto.numberOfPeople },
        },
        data: {
          bookedCount: { increment: dto.numberOfPeople },
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          "Not enough capacity remaining in this Mahaprasad slot",
        );
      }

      const totalAmountPaise = (slot.pricePerPersonPaise || 0) * dto.numberOfPeople;
      const reference = IdUtil.generateBookingReference("MP");
      const qrToken = IdUtil.generateQRToken();

      // If free token / zero price
      if (totalAmountPaise === 0) {
        const created = await tx.mahaprasadBooking.create({
          data: {
            userId: userId || null,
            slotId: dto.slotId,
            numberOfPeople: dto.numberOfPeople,
            devoteeName: dto.devoteeName,
            devoteePhone: dto.devoteePhone,
            reference,
            status: "CONFIRMED",
            qrToken,
          },
          include: { slot: true },
        });

        return { booking: created, payment: null };
      }

      // If paid booking: create booking PENDING_PAYMENT and Cashfree order
      const created = await tx.mahaprasadBooking.create({
        data: {
          userId: userId || null,
          slotId: dto.slotId,
          numberOfPeople: dto.numberOfPeople,
          devoteeName: dto.devoteeName,
          devoteePhone: dto.devoteePhone,
          reference,
          status: "PENDING_PAYMENT",
          qrToken,
        },
        include: { slot: true },
      });

      const cfOrder = await this.cashfree.createOrder({
        orderId: `MP_${reference}_${Date.now().toString(36).toUpperCase()}`,
        amount: totalAmountPaise,
        currency: "INR",
        customerId: userId || `guest_${Date.now()}`,
        customerName: dto.devoteeName,
        customerPhone: dto.devoteePhone,
        orderNote: `Mahaprasad Dining: ${slot.sessionName} (${reference})`,
      });

      const payment = await tx.payment.create({
        data: {
          mahaprasadId: created.id,
          entityType: "MAHAPRASAD_BOOKING",
          userId: userId || "GUEST_USER",
          amountPaise: totalAmountPaise,
          currency: "INR",
          status: "PENDING",
          gateway: "CASHFREE",
          razorpayOrderId: cfOrder.orderId,
          description: `Mahaprasad: ${slot.sessionName}`,
        },
      });

      return {
        booking: created,
        payment: {
          paymentId: payment.id,
          orderId: cfOrder.orderId,
          paymentSessionId: cfOrder.paymentSessionId,
          amountPaise: totalAmountPaise,
          currency: "INR",
          gateway: "CASHFREE",
        },
      };
    });

    return ApiResponseDto.success(booking);
  }

  async getBookingByReference(reference: string): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.mahaprasadBooking.findUnique({
      where: { reference },
      include: {
        slot: { select: { sessionName: true, date: true, startTime: true, endTime: true, templeId: true } },
        payment: true,
      },
    });
    if (!booking) throw new NotFoundException("Mahaprasad booking not found");
    return ApiResponseDto.success(booking);
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  async adminCreateSlot(
    dto: CreateMahaprasadSlotDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    let templeId = dto.templeId;
    if (!templeId) {
      const primary = await this.prisma.temple.findFirst({
        where: { status: "ACTIVE" },
      });
      if (!primary) throw new NotFoundException("Temple not found");
      templeId = primary.id;
    }

    const slot = await this.prisma.mahaprasadSlot.create({
      data: {
        templeId,
        sessionName: dto.sessionName,
        date: TimezoneUtil.parseTempleDate(dto.date),
        startTime: dto.startTime,
        endTime: dto.endTime,
        capacity: dto.capacity,
        pricePerPersonPaise: dto.pricePerPersonPaise ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    return ApiResponseDto.success(slot);
  }

  async adminUpdateSlot(
    id: string,
    dto: UpdateMahaprasadSlotDto,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.mahaprasadSlot.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Mahaprasad slot not found");

    const data: any = { ...dto };
    if (dto.date) {
      data.date = TimezoneUtil.parseTempleDate(dto.date);
    }

    const updated = await this.prisma.mahaprasadSlot.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(updated);
  }

  async adminGetBookings(params: {
    slotId?: string;
    date?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { slotId, date, status, page = 1, limit = 50 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (slotId) where.slotId = slotId;
    if (status) where.status = status;
    if (date) {
      const targetDate = TimezoneUtil.parseTempleDate(date);
      where.slot = { date: targetDate };
    }

    const [bookings, total] = await Promise.all([
      this.prisma.mahaprasadBooking.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          slot: true,
          payment: { select: { id: true, status: true, amountPaise: true } },
          user: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.mahaprasadBooking.count({ where }),
    ]);

    return ApiResponseDto.success(
      { bookings, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async adminCancelBooking(
    id: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.mahaprasadBooking.findUnique({ where: { id } });
      if (!booking) throw new NotFoundException("Booking not found");

      if (booking.status === "CANCELLED") {
        throw new ConflictException("Booking already cancelled");
      }

      // Decrement booked count on slot
      await tx.mahaprasadSlot.update({
        where: { id: booking.slotId },
        data: { bookedCount: { decrement: booking.numberOfPeople } },
      });

      const updated = await tx.mahaprasadBooking.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return updated;
    });

    return ApiResponseDto.success(result);
  }


  async adminCheckIn(
    id: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const booking = await this.prisma.mahaprasadBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    if (booking.status !== "CONFIRMED") {
      throw new ConflictException(
        `Cannot check in booking with status: ${booking.status}`,
      );
    }

    const updated = await this.prisma.mahaprasadBooking.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
        status: "COMPLETED",
      },
    });

    return ApiResponseDto.success(updated);
  }
}
