import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { RoomStatus, AccommodationStatus } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { CashfreeService } from "../payments/cashfree.service";
import { TimezoneUtil } from "../../common/utils/timezone.util";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class AccommodationService {
  constructor(
    private prisma: PrismaService,
    private cashfree: CashfreeService,
  ) {}

  // ============== ROOM MANAGEMENT ==============

  async createRoom(
    templeId: string,
    data: {
      roomNumber: string;
      type: string;
      capacity: number;
      pricePaise: number;
      amenities?: string[];
      description?: string;
      floor?: number;
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

    const room = await this.prisma.room.create({
      data: {
        templeId,
        roomNumber: data.roomNumber,
        type: data.type,
        capacity: data.capacity,
        pricePaise: data.pricePaise,
        amenities: data.amenities ?? [],
        description: data.description,
        floor: data.floor,
        status: (data.status as any) || "AVAILABLE",
      },
    });

    return ApiResponseDto.success(room);
  }

  async listRooms(
    templeId: string,
    status?: string,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (status) where.status = status;

    const rooms = await this.prisma.room.findMany({
      where,
      orderBy: { roomNumber: "asc" },
    });

    return ApiResponseDto.success(rooms);
  }

  async getRoom(id: string): Promise<ApiResponseDto<any>> {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException("Room not found");
    return ApiResponseDto.success(room);
  }

  async updateRoom(
    id: string,
    data: Partial<{
      roomNumber: string;
      type: string;
      capacity: number;
      pricePaise: number;
      amenities: string[];
      description: string;
      floor: number;
      status: RoomStatus;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const room = await this.prisma.room.update({ where: { id }, data });
    return ApiResponseDto.success(room);
  }

  async deleteRoom(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete room");
    }

    await this.prisma.room.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Room deleted" });
  }

  // ============== AVAILABILITY ==============

  async getAvailability(
    templeId: string,
    checkIn: string,
    checkOut: string,
    type?: string,
  ): Promise<ApiResponseDto<any>> {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkOutDate <= checkInDate)
      throw new BadRequestException("Check-out must be after check-in");

    const where: any = { templeId, status: "AVAILABLE" };
    if (type) where.type = type;

    const rooms = await this.prisma.room.findMany({
      where,
      include: {
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "CHECKED_IN"] },
            OR: [
              { checkIn: { lt: checkOutDate }, checkOut: { gt: checkInDate } },
            ],
          },
          select: { id: true, checkIn: true, checkOut: true, status: true },
        },
      },
    });

    const availableRooms = rooms
      .filter((r) => (r.bookings || []).length === 0)
      .map((r) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        type: r.type,
        capacity: r.capacity,
        pricePaise: r.pricePaise,
        amenities: r.amenities,
        description: r.description,
        floor: r.floor,
        totalNights: Math.ceil(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      }));

    return ApiResponseDto.success(availableRooms);
  }

  // ============== BOOKING MANAGEMENT ==============

  async createBooking(
    userId: string,
    data: {
      templeId: string;
      roomId: string;
      checkIn: string;
      checkOut: string;
      guests: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const checkInDate = new Date(data.checkIn);
    const checkOutDate = new Date(data.checkOut);
    if (checkOutDate <= checkInDate)
      throw new BadRequestException("Check-out must be after check-in");

    return this.prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: data.roomId } });
      if (!room || room.templeId !== data.templeId)
        throw new NotFoundException("Room not found");
      if (room.status !== "AVAILABLE")
        throw new ConflictException("Room is not available");
      if (data.guests > room.capacity)
        throw new BadRequestException(`Room capacity is ${room.capacity}`);

      // Check for overlapping bookings (including active checkout holds)
      const overlapping = await tx.accommodationBooking.findFirst({
        where: {
          roomId: data.roomId,
          status: { in: ["PENDING_PAYMENT", "CONFIRMED", "CHECKED_IN"] },
          OR: [
            { checkIn: { lt: checkOutDate }, checkOut: { gt: checkInDate } },
          ],
        },
      });
      if (overlapping)
        throw new ConflictException("Room not available for these dates");

      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const amountPaise = room.pricePaise * nights;
      const reference = IdUtil.generateBookingReference("AC");

      const booking = await tx.accommodationBooking.create({
        data: {
          userId,
          templeId: data.templeId,
          roomId: data.roomId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          guests: data.guests,
          amountPaise,
          status: "PENDING_PAYMENT",
          reference,
        },
        include: { room: true, user: { select: { id: true, name: true } } },
      });

      const cfOrderId = `ACC_${reference}_${Date.now().toString(36).toUpperCase()}`;

      // Create Cashfree order
      const cfOrder = await this.cashfree.createOrder({
        orderId: cfOrderId,
        amount: amountPaise,
        currency: "INR",
        customerId: userId,
        customerName: (booking as any).user?.name || "Devotee",
        orderNote: `Accommodation booking: ${reference}`,
      });

      await tx.payment.create({
        data: {
          accommodationId: booking.id,
          entityType: "ACCOMMODATION_BOOKING",
          userId,
          amountPaise,
          currency: "INR",
          status: "PENDING",
          gateway: "CASHFREE",
          razorpayOrderId: cfOrder.orderId,
          description: `Accommodation booking: ${reference}`,
        },
      });

      return ApiResponseDto.success({
        booking,
        orderId: cfOrder.orderId,
        paymentSessionId: cfOrder.paymentSessionId,
        amountPaise,
        gateway: "CASHFREE",
      });
    });
  }

  async verifyBookingPayment(data: {
    bookingId: string;
  }): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id: data.bookingId },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const payment = await this.prisma.payment.findUnique({
      where: { accommodationId: data.bookingId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === "SUCCESS") {
      throw new BadRequestException("Booking already paid");
    }

    const orderStatus = await this.cashfree.fetchOrderStatus(
      payment.razorpayOrderId || payment.id,
    );

    const isSuccess =
      orderStatus.orderStatus?.toUpperCase() === "PAID" ||
      orderStatus.payments?.some((p) => p.status?.toUpperCase() === "SUCCESS");

    if (isSuccess) {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            paidAt: new Date(),
          },
        });

        const updatedBooking = await tx.accommodationBooking.update({
          where: { id: data.bookingId },
          data: {
            status: "CONFIRMED",
            qrToken: IdUtil.generateQRToken(),
          },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            eventType: "PAYMENT_CAPTURED",
            status: "SUCCESS",
            amountPaise: payment.amountPaise,
            payload: orderStatus as any,
          },
        });

        return updatedBooking;
      });

      return ApiResponseDto.success(result);
    }

    return ApiResponseDto.success({
      bookingId: booking.id,
      status: payment.status,
      message: "Payment verification pending",
    });
  }

  async getBookingById(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id },
      include: {
        room: true,
        temple: { select: { id: true, name: true } },
        payment: true,
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    if (
      userId &&
      userRole &&
      booking.userId !== userId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
    ) {
      throw new ForbiddenException(
        "Cannot access another user's accommodation booking",
      );
    }

    return ApiResponseDto.success(booking);
  }

  async getUserBookings(
    userId: string,
    params: { status?: string; page?: number; limit?: number },
  ): Promise<ApiResponseDto<any>> {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status as any;

    const [bookings, total] = await Promise.all([
      this.prisma.accommodationBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { room: true, temple: { select: { id: true, name: true } } },
      }),
      this.prisma.accommodationBooking.count({ where }),
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
      page?: number;
      limit?: number;
    },
  ): Promise<ApiResponseDto<any>> {
    const { status, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const where: any = { templeId };
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      this.prisma.accommodationBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          room: true,
          user: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.accommodationBooking.count({ where }),
    ]);

    return ApiResponseDto.success(
      { bookings, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async checkIn(
    id: string,
    templeId: string,
    verifiedBy: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.templeId !== templeId)
      throw new ForbiddenException("Booking does not belong to this temple");
    if (booking.status !== "CONFIRMED")
      throw new BadRequestException("Booking not confirmed");

    const qrToken = booking.qrToken || IdUtil.generateQRToken();

    const updated = await this.prisma.accommodationBooking.update({
      where: { id },
      data: { status: "CHECKED_IN", checkedInAt: new Date(), qrToken },
    });

    return ApiResponseDto.success(updated);
  }

  async checkOut(id: string, templeId: string): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.templeId !== templeId)
      throw new ForbiddenException("Booking does not belong to this temple");
    if (booking.status !== "CHECKED_IN")
      throw new BadRequestException("Booking not checked in");

    const updated = await this.prisma.accommodationBooking.update({
      where: { id },
      data: { status: "COMPLETED", checkedOutAt: new Date() },
    });

    return ApiResponseDto.success(updated);
  }

  async cancelBooking(
    id: string,
    userId: string,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException("Booking not found");
    if (
      booking.userId !== userId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole)
    ) {
      throw new ForbiddenException("Cannot cancel this booking");
    }
    if (["CANCELLED", "COMPLETED", "CHECKED_OUT"].includes(booking.status)) {
      throw new BadRequestException("Booking cannot be cancelled");
    }

    const updated = await this.prisma.accommodationBooking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return ApiResponseDto.success(updated);
  }

  // ============== ABANDONED RESERVATION EXPIRATION ==============

  async expirePendingBookings(olderThanMinutes = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const expired = await this.prisma.accommodationBooking.findMany({
      where: {
        status: "PENDING_PAYMENT",
        createdAt: { lt: cutoff },
      },
      include: { payment: true },
    });

    let count = 0;
    for (const rawB of expired) {
      const b = rawB as any;
      if (b.payment?.status === "SUCCESS") continue;

      await this.prisma.$transaction(async (tx) => {
        const current = await tx.accommodationBooking.findUnique({
          where: { id: b.id },
          include: { payment: true },
        });
        if (!current || current.status !== "PENDING_PAYMENT" || (current as any).payment?.status === "SUCCESS") {
          return;
        }

        await tx.accommodationBooking.update({
          where: { id: b.id },
          data: { status: "CANCELLED" },
        });

        if (b.payment?.id && b.payment.status === "PENDING") {
          await tx.payment.update({
            where: { id: b.payment.id },
            data: { status: "CANCELLED" },
          });
        }

        count++;
      });
    }
    return count;
  }
}
