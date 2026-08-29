import { Module } from "@nestjs/common";

import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { ReservationCleanupScheduler } from "./reservation-cleanup.scheduler";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";
import { BookingModule } from "../booking/booking.module";
import { AccommodationModule } from "../accommodation/accommodation.module";
import { PrasadModule } from "../prasad/prasad.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BookingModule,
    AccommodationModule,
    PrasadModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, ReservationCleanupScheduler],
  exports: [AdminService, ReservationCleanupScheduler],
})
export class AdminModule {}
