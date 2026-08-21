import { Module } from "@nestjs/common";

import { AccommodationService } from "./accommodation.service";
import { AccommodationController } from "./accommodation.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentModule } from "../payments/payment.module";

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [AccommodationController],
  providers: [AccommodationService],
  exports: [AccommodationService],
})
export class AccommodationModule {}
