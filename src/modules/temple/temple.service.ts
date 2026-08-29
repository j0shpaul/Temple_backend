import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";

@Injectable()
export class TempleService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
    establishedYear?: number;
    contactPhone?: string;
    contactEmail?: string;
    status?: "ACTIVE" | "INACTIVE";
  }): Promise<ApiResponseDto<any>> {
    const temple = await this.prisma.temple.create({
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country || "India",
        pincode: data.pincode,
        latitude: data.latitude,
        longitude: data.longitude,
        establishedYear: data.establishedYear,
        contactPhone: data.contactPhone,
        contactEmail: data.contactEmail,
        status: data.status || "ACTIVE",
      },
    });

    return ApiResponseDto.success(temple);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    status?: "ACTIVE" | "INACTIVE";
    search?: string;
  }): Promise<ApiResponseDto<any>> {
    const { page = 1, limit = 20, status, search } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
      ];
    }

    const [temples, total] = await Promise.all([
      this.prisma.temple.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.temple.count({ where }),
    ]);

    return ApiResponseDto.success(
      { temples, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async findById(id: string): Promise<ApiResponseDto<any>> {
    const temple = await this.prisma.temple.findUnique({
      where: { id },
      include: {
        info: true,
        media: true,
        deities: { where: { isActive: true } },
        darshan: { where: { isActive: true }, include: { slots: true } },
        aarti: { where: { status: "ACTIVE" } },
        pujas: { where: { isActive: true } },
        sevas: { where: { isActive: true } },
        events: { where: { status: "PUBLISHED" }, take: 5 },
        rooms: { where: { status: "AVAILABLE" } },
        causes: { where: { isActive: true } },
        prasad: { where: { isActive: true } },
      },
    });

    if (!temple) {
      throw new NotFoundException("Temple not found");
    }

    return ApiResponseDto.success(temple);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      address: string;
      city: string;
      state: string;
      country: string;
      pincode: string;
      latitude: number;
      longitude: number;
      establishedYear: number;
      contactPhone: string;
      contactEmail: string;
      status: "ACTIVE" | "INACTIVE";
    }>,
    actorRole: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can update temple");
    }

    const temple = await this.prisma.temple.update({
      where: { id },
      data,
    });

    return ApiResponseDto.success(temple);
  }

  async delete(
    id: string,
    actorRole: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN"].includes(actorRole)) {
      throw new ForbiddenException("Only admins can delete temple");
    }

    await this.prisma.temple.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Temple deleted" });
  }
}
