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

import { NotificationsService } from "./notifications.service";
import { AnnouncementService } from "./announcement.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { TempleAccessGuard } from "../../common/guards/temple-access.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("Notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private announcementService: AnnouncementService,
  ) {}

  // ============== USER NOTIFICATIONS ==============

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get my notifications" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "type", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.notificationsService.getMyNotifications(user.id, {
      status,
      type,
      page,
      limit,
    });
  }

  @Get("me/unread-count")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get unread notification count" })
  async getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put("me/:id/read")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark notification as read" })
  async markAsRead(
    @CurrentUser() user: any,
    @Param("id") notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.id, notificationId);
  }

  @Put("me/read-all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark all notifications as read" })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ============== ANNOUNCEMENTS ==============

  @Get("temples/:templeId/announcements")
  @ApiOperation({ summary: "List announcements for a temple" })
  @ApiQuery({ name: "status", required: false, type: String })
  @ApiQuery({ name: "priority", required: false, type: String })
  @ApiQuery({
    name: "active",
    required: false,
    type: Boolean,
    description: "Filter active announcements",
  })
  async listAnnouncements(
    @Param("templeId") templeId: string,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("active") active?: boolean,
  ) {
    return this.announcementService.list(templeId, {
      status,
      priority,
      active,
    });
  }

  @Post("temples/:templeId/announcements")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create announcement (manager+)" })
  async createAnnouncement(
    @Param("templeId") templeId: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.announcementService.create(templeId, data, user.role);
  }

  @Get("temples/:templeId/announcements/:id")
  @ApiOperation({ summary: "Get announcement by ID" })
  async getAnnouncement(@Param("id") id: string) {
    return this.announcementService.getById(id);
  }

  @Put("temples/:templeId/announcements/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update announcement (manager+)" })
  async updateAnnouncement(
    @Param("id") id: string,
    @Body() data: any,
    @CurrentUser() user: any,
  ) {
    return this.announcementService.update(id, data, user.role);
  }

  @Post("temples/:templeId/announcements/:id/publish")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publish announcement (manager+)" })
  async publishAnnouncement(@Param("id") id: string, @CurrentUser() user: any) {
    return this.announcementService.publish(id, user.role);
  }

  @Delete("temples/:templeId/announcements/:id")
  @UseGuards(JwtAuthGuard, RolesGuard, TempleAccessGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete announcement (admin only)" })
  async deleteAnnouncement(@Param("id") id: string, @CurrentUser() user: any) {
    return this.announcementService.delete(id, user.role);
  }

  // ============== ADMIN NOTIFICATIONS ==============

  @Post("admin/send")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN", "MANAGER")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send notification to user (manager+)" })
  async adminSendNotification(
    @Body()
    data: {
      userId: string;
      type: string;
      title: string;
      body: string;
      data?: any;
      channel?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.adminSend(data.userId, data, user.role);
  }

  @Post("admin/broadcast")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Broadcast notification to all users (admin only)" })
  async broadcastNotification(
    @Body()
    data: {
      type: string;
      title: string;
      body: string;
      data?: any;
      channel?: string;
      roleFilter?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.notificationsService.broadcast(data, user.role);
  }
}
