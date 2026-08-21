import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { IdUtil } from "../../common/utils/id.util";

export interface QrVerificationResult {
  valid: boolean;
  entityType: "BOOKING" | "EVENT_REGISTRATION" | "ACCOMMODATION_BOOKING";
  entityId: string;
  data: any;
  error?: string;
}

@Injectable()
export class QrService {
  constructor(private prisma: PrismaService) {}

  async generateQrToken(): Promise<string> {
    return IdUtil.generateQRToken();
  }

  async verifyQrToken(
    qrToken: string,
  ): Promise<ApiResponseDto<QrVerificationResult>> {
    // Try booking
    const booking = await this.prisma.booking.findUnique({
      where: { qrToken },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        temple: { select: { id: true, name: true } },
        attendees: true,
      },
    });

    if (booking) {
      if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
        return ApiResponseDto.success({
          valid: false,
          entityType: "BOOKING",
          entityId: booking.id,
          data: { booking, status: booking.status },
          error: `Booking status: ${booking.status}. Expected CONFIRMED or CHECKED_IN.`,
        });
      }

      return ApiResponseDto.success({
        valid: true,
        entityType: "BOOKING",
        entityId: booking.id,
        data: {
          booking: {
            id: booking.id,
            reference: booking.reference,
            type: booking.bookingType,
            slotDate: booking.slotDate,
            slotStartTime: booking.slotStartTime,
            slotEndTime: booking.slotEndTime,
            quantity: booking.quantity,
            devoteeName: booking.devoteeName,
            devoteePhone: booking.devoteePhone,
            status: booking.status,
            checkedInAt: booking.checkedInAt,
          },
          user: booking.user,
          temple: booking.temple,
          attendees: booking.attendees,
        },
      });
    }

    // Try event registration
    const eventReg = await this.prisma.eventRegistration.findUnique({
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

    if (eventReg) {
      if (eventReg.status !== "REGISTERED" && eventReg.status !== "ATTENDED") {
        return ApiResponseDto.success({
          valid: false,
          entityType: "EVENT_REGISTRATION",
          entityId: eventReg.id,
          data: { eventReg, status: eventReg.status },
          error: `Registration status: ${eventReg.status}. Expected REGISTERED or ATTENDED.`,
        });
      }

      return ApiResponseDto.success({
        valid: true,
        entityType: "EVENT_REGISTRATION",
        entityId: eventReg.id,
        data: {
          registration: {
            id: eventReg.id,
            status: eventReg.status,
            registeredAt: eventReg.registeredAt,
            cancelledAt: eventReg.cancelledAt,
          },
          event: eventReg.event,
          user: eventReg.user,
        },
      });
    }

    // Try accommodation booking
    const accBooking = await this.prisma.accommodationBooking.findUnique({
      where: { qrToken },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        temple: { select: { id: true, name: true } },
        room: {
          select: { id: true, roomNumber: true, type: true, capacity: true },
        },
      },
    });

    if (accBooking) {
      if (
        accBooking.status !== "CONFIRMED" &&
        accBooking.status !== "CHECKED_IN"
      ) {
        return ApiResponseDto.success({
          valid: false,
          entityType: "ACCOMMODATION_BOOKING",
          entityId: accBooking.id,
          data: { booking: accBooking, status: accBooking.status },
          error: `Booking status: ${accBooking.status}. Expected CONFIRMED or CHECKED_IN.`,
        });
      }

      return ApiResponseDto.success({
        valid: true,
        entityType: "ACCOMMODATION_BOOKING",
        entityId: accBooking.id,
        data: {
          booking: {
            id: accBooking.id,
            reference: accBooking.reference,
            checkIn: accBooking.checkIn,
            checkOut: accBooking.checkOut,
            guests: accBooking.guests,
            status: accBooking.status,
            checkedInAt: accBooking.checkedInAt,
            checkedOutAt: accBooking.checkedOutAt,
          },
          user: accBooking.user,
          temple: accBooking.temple,
          room: accBooking.room,
        },
      });
    }

    return ApiResponseDto.success({
      valid: false,
      entityType: "BOOKING",
      entityId: "",
      data: null,
      error: "Invalid QR code - not found in any system",
    });
  }

  async checkInBooking(
    qrToken: string,
    verifiedBy: string,
    templeId: string,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.verifyQrToken(qrToken);

    if (!result.data?.valid) {
      throw new BadRequestException(result.data?.error || "Invalid QR code");
    }

    if (result.data.entityType !== "BOOKING") {
      throw new BadRequestException("QR code is not for a booking");
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: result.data.entityId },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.templeId !== templeId)
      throw new ForbiddenException("Booking does not belong to this temple");
    if (booking.status === "CHECKED_IN")
      throw new BadRequestException("Already checked in");

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CHECKED_IN",
          checkedInAt: new Date(),
        },
      });

      await tx.checkIn.create({
        data: {
          bookingId: booking.id,
          userId: verifiedBy,
          templeId,
          location: "Temple entrance",
        },
      });

      return updatedBooking;
    });

    return ApiResponseDto.success(updated);
  }

  async checkInEvent(
    qrToken: string,
    verifiedBy: string,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.verifyQrToken(qrToken);

    if (!result.data?.valid) {
      throw new BadRequestException(result.data?.error || "Invalid QR code");
    }

    if (result.data.entityType !== "EVENT_REGISTRATION") {
      throw new BadRequestException("QR code is not for an event registration");
    }

    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id: result.data.entityId },
    });

    if (!registration) throw new NotFoundException("Registration not found");
    if (registration.status === "ATTENDED")
      throw new BadRequestException("Already marked as attended");

    const updated = await this.prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: "ATTENDED",
      },
    });

    return ApiResponseDto.success(updated);
  }

  async checkInAccommodation(
    qrToken: string,
    verifiedBy: string,
    templeId: string,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.verifyQrToken(qrToken);

    if (!result.data?.valid) {
      throw new BadRequestException(result.data?.error || "Invalid QR code");
    }

    if (result.data.entityType !== "ACCOMMODATION_BOOKING") {
      throw new BadRequestException(
        "QR code is not for an accommodation booking",
      );
    }

    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id: result.data.entityId },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.templeId !== templeId)
      throw new ForbiddenException("Booking does not belong to this temple");
    if (booking.status === "CHECKED_IN")
      throw new BadRequestException("Already checked in");

    const updated = await this.prisma.accommodationBooking.update({
      where: { id: booking.id },
      data: {
        status: "CHECKED_IN",
        checkedInAt: new Date(),
      },
    });

    return ApiResponseDto.success(updated);
  }

  async checkOutAccommodation(
    qrToken: string,
    templeId: string,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.verifyQrToken(qrToken);

    if (!result.data?.valid) {
      throw new BadRequestException(result.data?.error || "Invalid QR code");
    }

    if (result.data.entityType !== "ACCOMMODATION_BOOKING") {
      throw new BadRequestException(
        "QR code is not for an accommodation booking",
      );
    }

    const booking = await this.prisma.accommodationBooking.findUnique({
      where: { id: result.data.entityId },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    if (booking.templeId !== templeId)
      throw new ForbiddenException("Booking does not belong to this temple");
    if (booking.status !== "CHECKED_IN")
      throw new BadRequestException("Booking not checked in");

    const updated = await this.prisma.accommodationBooking.update({
      where: { id: booking.id },
      data: {
        status: "CHECKED_OUT",
        checkedOutAt: new Date(),
      },
    });

    return ApiResponseDto.success(updated);
  }

  // Bulk QR generation for staff - regenerate tokens for bookings without QR
  async regenerateMissingBookingQrs(
    templeId: string,
  ): Promise<ApiResponseDto<{ updated: number }>> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        templeId,
        qrToken: null,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    });

    let updated = 0;
    for (const booking of bookings) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          qrToken: await this.generateQrToken(),
          qrGeneratedAt: new Date(),
        },
      });
      updated++;
    }

    return ApiResponseDto.success({ updated });
  }

  async regenerateMissingAccommodationQrs(
    templeId: string,
  ): Promise<ApiResponseDto<{ updated: number }>> {
    const bookings = await this.prisma.accommodationBooking.findMany({
      where: {
        templeId,
        qrToken: null,
        status: { in: ["CONFIRMED", "CHECKED_IN"] },
      },
    });

    let updated = 0;
    for (const booking of bookings) {
      await this.prisma.accommodationBooking.update({
        where: { id: booking.id },
        data: { qrToken: await this.generateQrToken() },
      });
      updated++;
    }

    return ApiResponseDto.success({ updated });
  }
}
