import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";

import { JigyasaService } from "./jigyasa.service";
import { AskQuestionDto } from "./dto/ask-question.dto";
import { AnswerQuestionDto } from "./dto/answer-question.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Jigyasa Samadhan")
@Controller("jigyasa")
export class JigyasaController {
  constructor(private jigyasaService: JigyasaService) {}

  @Get()
  @ApiOperation({
    summary: "List answered spiritual questions & explanations (public)",
  })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getPublicJigyasa(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.jigyasaService.getPublicJigyasa({
      category,
      search,
      page,
      limit,
    });
  }

  @Post()
  @ApiOperation({ summary: "Submit spiritual inquiry / question (public)" })
  async submitQuestion(
    @Body() dto: AskQuestionDto,
    @CurrentUser() user: any,
  ) {
    return this.jigyasaService.submitQuestion(dto, user?.id);
  }
}

@ApiTags("Jigyasa Admin")
@Controller("admin/jigyasa")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
@ApiBearerAuth()
export class AdminJigyasaController {
  constructor(private jigyasaService: JigyasaService) {}

  @Get()
  @ApiOperation({ summary: "List all questions including pending & drafts (admin)" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "isPublic", required: false, type: Boolean })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async adminGetQuestions(
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("isPublic") isPublic?: boolean,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.jigyasaService.adminGetQuestions({
      status,
      category,
      isPublic:
        isPublic !== undefined ? String(isPublic) === "true" : undefined,
      search,
      page,
      limit,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get single question details (admin)" })
  async adminGetQuestionById(@Param("id") id: string) {
    return this.jigyasaService.adminGetQuestionById(id);
  }

  @Put(":id/answer")
  @ApiOperation({ summary: "Provide spiritual answer to question (admin)" })
  async adminAnswerQuestion(
    @Param("id") id: string,
    @Body() dto: AnswerQuestionDto,
    @CurrentUser() user: any,
  ) {
    return this.jigyasaService.adminAnswerQuestion(
      id,
      dto,
      user?.name,
      user?.role,
    );
  }

  @Put(":id/publish")
  @ApiOperation({ summary: "Set question public visibility (admin)" })
  async adminSetPublishStatus(
    @Param("id") id: string,
    @Body("isPublic") isPublic: boolean,
    @CurrentUser() user: any,
  ) {
    return this.jigyasaService.adminSetPublishStatus(
      id,
      Boolean(isPublic),
      user?.role,
    );
  }

  @Put(":id/reject")
  @ApiOperation({ summary: "Reject inappropriate question (admin)" })
  async adminRejectQuestion(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.jigyasaService.adminRejectQuestion(id, user?.role);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiOperation({ summary: "Delete question (admin)" })
  async adminDeleteQuestion(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.jigyasaService.adminDeleteQuestion(id, user?.role);
  }
}
