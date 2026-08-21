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

import { EventsService } from "./events.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Events")
@Controller("temples/:templeId/events")
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create event (manager+)" })
  async create(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.create(templeId, data, user.role);
  }

  @Get()
  @ApiOperation({ summary: "List events for a temple" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "upcoming", required: false, type: Boolean })
  async list(
    @Param("templeId") templeId: string,
    @Query("status") status?: string,
    @Query("upcoming") upcoming?: boolean,
  ) {
    return this.eventsService.list(templeId, { status, upcoming });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get event by ID" })
  async getById(@Param("id") id: string) {
    return this.eventsService.getById(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update event (manager+)" })
  async update(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.update(id, data, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete event (admin only)" })
  async delete(@Param("id") id: string, @CurrentUser() user: any) {
    return this.eventsService.delete(id, user.role);
  }

  // Registration endpoints
  @Post(":id/register")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Register for event" })
  async register(@Param("id") eventId: string, @CurrentUser() user: any) {
    return this.eventsService.register(user.id, eventId);
  }

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cancel event registration" })
  async cancelRegistration(
    @Param("id") eventId: string,
    @CurrentUser() user: any,
  ) {
    return this.eventsService.cancelRegistration(user.id, eventId);
  }

  @Get("registrations/me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my event registrations" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyRegistrations(
    @CurrentUser() user: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.eventsService.getMyRegistrations(user.id, { page, limit });
  }

  @Get(":id/registrations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get event registrations (staff+)" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getEventRegistrations(
    @Param("id") eventId: string,
    @Query("status") status?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.eventsService.getEventRegistrations(eventId, {
      status,
      page,
      limit,
    });
  }

  @Get("qr/verify/:qrToken")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER", "STAFF")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify QR token for check-in (staff+)" })
  async verifyQr(@Param("qrToken") qrToken: string) {
    return this.eventsService.verifyQrToken(qrToken);
  }
}
