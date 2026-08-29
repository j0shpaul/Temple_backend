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

import { GurukulService } from "./gurukul.service";
import { CreateAdmissionDto } from "./dto/create-admission.dto";
import { UpdateAdmissionDto } from "./dto/update-admission.dto";
import { UpdateGurukulDto } from "./dto/update-gurukul.dto";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Gurukul")
@Controller("gurukul")
export class GurukulController {
  constructor(private gurukulService: GurukulService) {}

  @Get()
  @ApiOperation({ summary: "Get Gurukul identity, overview and daily schedule (public)" })
  @ApiQuery({ name: "templeId", required: false, type: String })
  async getGurukul(@Query("templeId") templeId?: string) {
    return this.gurukulService.getGurukul(templeId);
  }

  @Get("dincharya")
  @ApiOperation({ summary: "Get Gurukul Dincharya (daily routine schedule) (public)" })
  @ApiQuery({ name: "gurukulId", required: false, type: String })
  async getDincharya(@Query("gurukulId") gurukulId?: string) {
    return this.gurukulService.getDincharya(gurukulId);
  }

  @Post("admissions")
  @ApiOperation({ summary: "Submit Gurukul admission / Pravesh application (public)" })
  async createAdmission(@Body() dto: CreateAdmissionDto) {
    return this.gurukulService.createAdmission(dto);
  }
}

@ApiTags("Gurukul Admin")
@Controller("admin/gurukul")
@UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
@Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
@ApiBearerAuth()
export class AdminGurukulController {
  constructor(private gurukulService: GurukulService) {}

  @Get()
  @ApiOperation({ summary: "Get Gurukul details with schedules & counts (admin)" })
  @ApiQuery({ name: "id", required: false, type: String })
  async adminGetGurukul(@Query("id") id?: string) {
    return this.gurukulService.adminGetGurukul(id);
  }

  @Put(":id")
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiOperation({ summary: "Update Gurukul overview and guidelines (admin)" })
  async adminUpdateGurukul(
    @Param("id") id: string,
    @Body() dto: UpdateGurukulDto,
    @CurrentUser() user: any,
  ) {
    return this.gurukulService.adminUpdateGurukul(id, dto, user?.role);
  }

  @Get("admissions")
  @ApiOperation({ summary: "List admission applications with filters (admin)" })
  @ApiQuery({ name: "gurukulId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async adminGetAdmissions(
    @Query("gurukulId") gurukulId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.gurukulService.adminGetAdmissions({
      gurukulId,
      status,
      search,
      page,
      limit,
    });
  }

  @Get("admissions/:id")
  @ApiOperation({ summary: "Get single admission application details (admin)" })
  async adminGetAdmissionById(@Param("id") id: string) {
    return this.gurukulService.adminGetAdmissionById(id);
  }

  @Put("admissions/:id")
  @ApiOperation({ summary: "Review and update admission status & notes (admin)" })
  async adminUpdateAdmission(
    @Param("id") id: string,
    @Body() dto: UpdateAdmissionDto,
    @CurrentUser() user: any,
  ) {
    return this.gurukulService.adminUpdateAdmission(id, dto, user?.role);
  }

  @Post("schedule")
  @ApiOperation({ summary: "Create new Dincharya schedule entry (admin)" })
  async adminCreateSchedule(
    @Body() dto: CreateScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.gurukulService.adminCreateSchedule(dto, user?.role);
  }

  @Put("schedule/:id")
  @ApiOperation({ summary: "Update Dincharya schedule entry (admin)" })
  async adminUpdateSchedule(
    @Param("id") id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: any,
  ) {
    return this.gurukulService.adminUpdateSchedule(id, dto, user?.role);
  }

  @Delete("schedule/:id")
  @HttpCode(HttpStatus.OK)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiOperation({ summary: "Delete Dincharya schedule entry (admin)" })
  async adminDeleteSchedule(
    @Param("id") id: string,
    @CurrentUser() user: any,
  ) {
    return this.gurukulService.adminDeleteSchedule(id, user?.role);
  }
}
