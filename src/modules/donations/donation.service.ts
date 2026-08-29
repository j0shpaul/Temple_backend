import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { PaymentService } from "../payments/payment.service";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class DonationService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
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
    if (isActive !== undefined) where.isActive = String(isActive) === "true";

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
      isDirect?: boolean;
      paymentMethod?: string;
    },
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (data.amountPaise <= 0)
      throw new BadRequestException("Donation amount must be positive");

    const cause = await this.prisma.donationCause.findFirst({
      where: { id: data.causeId, templeId: data.templeId, isActive: true },
    });
    if (!cause) throw new NotFoundException("Donation cause not found");

    const isStaffAdmin = actorRole && ["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole);
    const isDirectOffline = data.isDirect === true || isStaffAdmin;

    const reference = IdUtil.generateOrderReference().replace("ORD", "DON");

    if (isDirectOffline) {
      const temple = await this.prisma.temple.findUnique({
        where: { id: data.templeId },
      });

      const receiptNumber = IdUtil.generateReceiptNumber();
      const result = await this.prisma.$transaction(async (tx) => {
        const donation = await tx.donation.create({
          data: {
            userId,
            templeId: data.templeId,
            causeId: data.causeId,
            amountPaise: data.amountPaise,
            currency: "INR",
            isAnonymous: data.isAnonymous ?? false,
            donorName: data.donorName,
            message: data.message,
            status: "SUCCESS",
            reference,
          },
          include: { cause: true, user: true },
        });

        const payment = await tx.payment.create({
          data: {
            donationId: donation.id,
            entityType: "DONATION",
            userId,
            amountPaise: data.amountPaise,
            currency: "INR",
            status: "SUCCESS",
            receiptNumber,
            description: `Direct donation: ${cause.name}`,
            paidAt: new Date(),
          },
        });

        const receipt = await tx.donationReceipt.create({
          data: {
            donationId: donation.id,
            receiptNumber,
            amountPaise: donation.amountPaise,
            donorName: donation.isAnonymous
              ? "Anonymous"
              : donation.donorName || undefined,
            causeName: cause.name,
            templeName: temple?.name || "Temple",
          },
        });

        return { donation, payment, receipt };
      });

      return ApiResponseDto.success({
        donationId: result.donation.id,
        reference,
        status: "SUCCESS",
        amountPaise: data.amountPaise,
        receiptNumber: result.receipt.receiptNumber,
        receipt: result.receipt,
        donation: result.donation,
      });
    }

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

    // Delegate payment order creation to central PaymentService
    const paymentResult = await this.paymentService.createPaymentForDonation(
      donation.id,
      userId,
    );

    return ApiResponseDto.success({
      donationId: donation.id,
      reference,
      orderId: paymentResult.data?.orderId,
      paymentSessionId: paymentResult.data?.paymentSessionId,
      amountPaise: data.amountPaise,
      currency: "INR",
      gateway: "CASHFREE",
    });
  }

  async verifyDonation(data: {
    donationId: string;
    orderId?: string;
  }): Promise<ApiResponseDto<any>> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: data.donationId },
    });
    if (!donation) throw new NotFoundException("Donation not found");

    const payment = await this.prisma.payment.findUnique({
      where: { donationId: data.donationId },
    });
    if (!payment) throw new NotFoundException("Payment not found");

    // Server-side authoritative status verification & reconciliation
    return this.paymentService.reconcilePayment(payment.id);
  }

  async getById(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponseDto<any>> {
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

    if (
      userId &&
      userRole &&
      donation.userId !== userId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
    ) {
      throw new ForbiddenException("Cannot access another user's donation");
    }

    return ApiResponseDto.success(donation);
  }

  async getReceipt(
    donationId: string,
    userId?: string,
    userRole?: string,
  ): Promise<ApiResponseDto<any>> {
    const receipt = await this.prisma.donationReceipt.findUnique({
      where: { donationId },
      include: { donation: { include: { temple: true } } },
    });
    if (!receipt) throw new NotFoundException("Receipt not found");

    if (
      userId &&
      userRole &&
      receipt.donation.userId !== userId &&
      !["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(userRole)
    ) {
      throw new ForbiddenException(
        "Cannot access another user's donation receipt",
      );
    }

    return ApiResponseDto.success(receipt);
  }

  async getUserDonations(
    userId: string,
    params: { page?: number; limit?: number },
  ): Promise<ApiResponseDto<any>> {
    const { page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where: { userId },
        skip,
        take: limitNum,
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
      { donations, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
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
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { templeId };
    if (status) where.status = status;

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take: limitNum,
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
      { donations, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }
}
