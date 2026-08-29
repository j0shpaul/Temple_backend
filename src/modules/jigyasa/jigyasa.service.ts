import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ApiResponseDto } from "../../common/dto/api-response.dto";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { AnswerQuestionDto } from "./dto/answer-question.dto";

@Injectable()
export class JigyasaService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // PUBLIC METHODS (Strict Privacy Enforcement)
  // ==========================================

  async getPublicJigyasa(params: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { category, search, page = 1, limit = 20 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Strict filter: Only answered AND publicly marked questions
    const where: any = {
      status: "ANSWERED",
      isPublic: true,
    };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: "insensitive" } },
        { answer: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.jigyasa.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { answeredAt: "desc" },
        select: {
          id: true,
          askerName: true,
          question: true,
          category: true,
          answer: true,
          answeredBy: true,
          answeredAt: true,
          createdAt: true,
        },
      }),
      this.prisma.jigyasa.count({ where }),
    ]);

    return ApiResponseDto.success(
      { items, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async submitQuestion(
    dto: AskQuestionDto,
    userId?: string,
  ): Promise<ApiResponseDto<{ id: string; message: string }>> {
    const jigyasa = await this.prisma.jigyasa.create({
      data: {
        userId: userId || null,
        askerName: dto.askerName,
        askerPhone: dto.askerPhone || null,
        question: dto.question,
        category: dto.category || "General",
        status: "PENDING",
        isPublic: false,
      },
    });

    return ApiResponseDto.success({
      id: jigyasa.id,
      message:
        "Your question has been received. Temple scholars / Acharyas will review and answer it.",
    });
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  async adminGetQuestions(params: {
    status?: string;
    category?: string;
    isPublic?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponseDto<any>> {
    const { status, category, isPublic, search, page = 1, limit = 50 } = params;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 50);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (isPublic !== undefined) where.isPublic = isPublic;
    if (search) {
      where.OR = [
        { question: { contains: search, mode: "insensitive" } },
        { askerName: { contains: search, mode: "insensitive" } },
        { askerPhone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.jigyasa.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, phone: true } } },
      }),
      this.prisma.jigyasa.count({ where }),
    ]);

    return ApiResponseDto.success(
      { items, total, page: pageNum, limit: limitNum },
      { totalPages: Math.ceil(total / limitNum) },
    );
  }

  async adminGetQuestionById(id: string): Promise<ApiResponseDto<any>> {
    const item = await this.prisma.jigyasa.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });
    if (!item) throw new NotFoundException("Jigyasa question not found");
    return ApiResponseDto.success(item);
  }

  async adminAnswerQuestion(
    id: string,
    dto: AnswerQuestionDto,
    actorName?: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions to answer questions");
    }

    const existing = await this.prisma.jigyasa.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jigyasa question not found");

    const updated = await this.prisma.jigyasa.update({
      where: { id },
      data: {
        answer: dto.answer,
        answeredBy: dto.answeredBy || actorName || "Temple Scholar",
        answeredAt: new Date(),
        status: "ANSWERED",
        isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
      },
    });

    return ApiResponseDto.success(updated);
  }

  async adminSetPublishStatus(
    id: string,
    isPublic: boolean,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.jigyasa.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jigyasa question not found");

    const updated = await this.prisma.jigyasa.update({
      where: { id },
      data: { isPublic },
    });

    return ApiResponseDto.success(updated);
  }

  async adminRejectQuestion(
    id: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<any>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.jigyasa.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jigyasa question not found");

    const updated = await this.prisma.jigyasa.update({
      where: { id },
      data: { status: "REJECTED", isPublic: false },
    });

    return ApiResponseDto.success(updated);
  }

  async adminDeleteQuestion(
    id: string,
    actorRole?: string,
  ): Promise<ApiResponseDto<{ message: string }>> {
    if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(actorRole || "")) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const existing = await this.prisma.jigyasa.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Jigyasa question not found");

    await this.prisma.jigyasa.delete({ where: { id } });
    return ApiResponseDto.success({ message: "Question deleted successfully" });
  }
}
