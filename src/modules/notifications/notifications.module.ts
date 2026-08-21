import { Module } from "@nestjs/common";

import { NotificationsService } from "./notifications.service";
import { AnnouncementService } from "./announcement.service";
import { NotificationsController } from "./notifications.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AnnouncementService],
  exports: [NotificationsService, AnnouncementService],
})
export class NotificationsModule {}
