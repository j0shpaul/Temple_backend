import { Module } from "@nestjs/common";

import { DonationService } from "./donation.service";
import { DonationController } from "./donation.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentModule } from "../payments/payment.module";

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [DonationController],
  providers: [DonationService],
  exports: [DonationService],
})
export class DonationModule {}
