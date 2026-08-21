import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { RazorpayService } from "../payments/razorpay.service";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class DonationService {
  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  async createCause(
    templeId: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      isDefault?: boolean;
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

    const cause = await this.prisma.donationCause.create({
      data: {
        templeId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    return ApiResponseDto.success(cause);
  }

  async listCauses(
    templeId: string,
    isActive?: boolean,
  ): Promise<ApiResponseDto<any[]>> {
    const where: any = { templeId };
    if (isActive !== undefined) where.isActive = isActive;

    const causes = await this.prisma.donationCause.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { displayOrder: "asc" }],
    });

    return ApiResponseDto.success(causes);
  }

  async updateCause(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      description: string;
      isDefault: boolean;
      isActive: boolean;
      displayOrder: number;
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const cause = await this.prisma.donationCause.update({
      where: { id },
      data,
    });
    return ApiResponseDto.success(cause);
  }

  async deleteCause(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete donation cause");
    }

    await this.prisma.donationCause.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Donation cause deleted" });
  }

  async createDonation(
    userId: string,
    data: {
      templeId: string;
      causeId: string;
      amountPaise: number;
      isAnonymous?: boolean;
      donorName?: string;
      message?: string;
    },
  ): Promise<ApiResponseDto<any>> {
    if (data.amountPaise <= 0)
      throw new BadRequestException("Donation amount must be positive");

    const cause = await this.prisma.donationCause.findFirst({
      where: { id: data.causeId, templeId: data.templeId, isActive: true },
    });
    if (!cause) throw new NotFoundException("Donation cause not found");

    const reference = IdUtil.generateOrderReference().replace("ORD", "DON");
    const donation = await this.prisma.donation.create({
      data: {
        userId,
        templeId: data.templeId,
        causeId: data.causeId,
        amountPaise: data.amountPaise,
        currency: "INR",
        isAnonymous: data.isAnonymous ?? false,
        donorName: data.donorName,
        message: data.message,
        status: "PENDING",
        reference,
      },
    });

    // Create Razorpay order
    const order = await this.razorpay.createOrder({
      amount: data.amountPaise,
      currency: "INR",
      receipt: IdUtil.generateReceiptNumber(),
      notes: { donationId: donation.id, reference },
    });

    await this.prisma.payment.create({
      data: {
        donationId: donation.id,
        entityType: "DONATION",
        userId,
        amountPaise: data.amountPaise,
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: order.id,
        description: `Donation: ${cause.name}`,
      },
    });

    return ApiResponseDto.success({
      donationId: donation.id,
      reference,
      razorpayOrderId: order.id,
      amountPaise: data.amountPaise,
      currency: "INR",
      keyId: this.razorpay.getKeyId(),
    });
  }

  async verifyDonation(data: {
    donationId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<ApiResponseDto<any>> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: data.donationId },
    });
    if (!donation) throw new NotFoundException("Donation not found");

    const payment = await this.prisma.payment.findUnique({
      where: { donationId: data.donationId },
    });
    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === "SUCCESS") {
      throw new BadRequestException("Donation already processed");
    }

    const isValid = await this.razorpay.verifyPayment(
      data.razorpayOrderId,
      data.razorpayPaymentId,
      data.razorpaySignature,
    );
    if (!isValid) throw new BadRequestException("Invalid payment signature");

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature,
          paidAt: new Date(),
        },
      });

      const updatedDonation = await tx.donation.update({
        where: { id: data.donationId },
        data: { status: "SUCCESS" },
      });

      // Issue receipt
      const cause = await tx.donationCause.findUnique({
        where: { id: updatedDonation.causeId },
      });
      const temple = await tx.temple.findUnique({
        where: { id: updatedDonation.templeId },
      });

      const receipt = await tx.donationReceipt.create({
        data: {
          donationId: updatedDonation.id,
          receiptNumber: IdUtil.generateReceiptNumber(),
          amountPaise: updatedDonation.amountPaise,
          donorName: updatedDonation.isAnonymous
            ? "Anonymous"
            : updatedDonation.donorName || undefined,
          causeName: cause?.name || "General Donation",
          templeName: temple?.name || "Temple",
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          eventType: "PAYMENT_CAPTURED",
          status: "SUCCESS",
          amountPaise: payment.amountPaise,
          payload: data as any,
        },
      });

      return { payment: updatedPayment, donation: updatedDonation, receipt };
    });

    return ApiResponseDto.success(result);
  }

  async getById(id: string): Promise<ApiResponseDto<any>> {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        cause: { select: { id: true, name: true } },
        temple: { select: { id: true, name: true } },
        receipt: true,
        payment: true,
      },
    });
    if (!donation) throw new NotFoundException("Donation not found");
    return ApiResponseDto.success(donation);
  }

  async getReceipt(donationId: string): Promise<ApiResponseDto<any>> {
    const receipt = await this.prisma.donationReceipt.findUnique({
      where: { donationId },
      include: { donation: { include: { temple: true } } },
    });
    if (!receipt) throw new NotFoundException("Receipt not found");
    return ApiResponseDto.success(receipt);
  }

  async getUserDonations(
    userId: string,
    params: { page?: number; limit?: number },
  ): Promise<ApiResponseDto<any>> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          cause: { select: { id: true, name: true } },
          temple: { select: { id: true, name: true } },
          receipt: true,
        },
      }),
      this.prisma.donation.count({ where: { userId } }),
    ]);

    return ApiResponseDto.success(
      { donations, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }

  async getTempleDonations(
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

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          cause: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, phone: true } },
          receipt: true,
        },
      }),
      this.prisma.donation.count({ where }),
    ]);

    return ApiResponseDto.success(
      { donations, total, page, limit },
      { totalPages: Math.ceil(total / limit) },
    );
  }
}
