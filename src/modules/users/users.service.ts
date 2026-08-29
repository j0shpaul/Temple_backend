import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { IdUtil } from "../../common/utils/id.util";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }): Promise<
    ApiResponseDto<{ users: any[]; total: number; page: number; limit: number }>
  > {
    const { page = 1, limit = 20, role, status, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
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
          createdAt: true,
          _count: {
            select: { bookings: true, donations: true, prasadOrders: true },
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

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
        isVerified: true,
        dateOfBirth: true,
        gender: true,
        emergencyContact: true,
        latitude: true,
        longitude: true,
        isProfileComplete: true,
        createdAt: true,
        addresses: true,
        bookings: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            reference: true,
            status: true,
            bookingType: true,
            createdAt: true,
          },
        },
        donations: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            reference: true,
            amountPaise: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return ApiResponseDto.success(user);
  }

  async updateRole(
    id: string,
    role: string,
    actorId: string,
  ): Promise<ApiResponseDto<any>> {
    if (id === actorId) {
      throw new ForbiddenException("Cannot change your own role");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    return ApiResponseDto.success(user);
  }

  async updateStatus(
    id: string,
    status: string,
    actorId: string,
  ): Promise<ApiResponseDto<any>> {
    if (id === actorId) {
      throw new ForbiddenException("Cannot change your own status");
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: { status: status as any },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    return ApiResponseDto.success(user);
  }

  async addAddress(
    userId: string,
    data: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
      phone: string;
      isDefault?: boolean;
    },
  ): Promise<ApiResponseDto<any>> {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        ...data,
        userId,
        country: data.country || "India",
      },
    });

    return ApiResponseDto.success(address);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    data: Partial<{
      line1: string;
      line2: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
      phone: string;
      isDefault: boolean;
    }>,
  ): Promise<ApiResponseDto<any>> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    if (data.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.address.update({
      where: { id: addressId },
      data,
    });

    return ApiResponseDto.success(updated);
  }

  async deleteAddress(
    userId: string,
    addressId: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException("Address not found");
    }

    await this.prisma.address.delete({ where: { id: addressId } });
    return ApiResponseDto.success({ message: "Address deleted" });
  }

  async updateLocation(
    userId: string,
    data: { latitude: number; longitude: number },
  ): Promise<ApiResponseDto<{ latitude: number; longitude: number }>> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    return ApiResponseDto.success({
      latitude: data.latitude,
      longitude: data.longitude,
    });
  }
}
