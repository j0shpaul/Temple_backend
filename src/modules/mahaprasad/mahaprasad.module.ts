import { Module } from "@nestjs/common";
import {
  MahaprasadController,
  AdminMahaprasadController,
} from "./mahaprasad.controller";
import { MahaprasadService } from "./mahaprasad.service";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentModule } from "../payments/payment.module";

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [MahaprasadController, AdminMahaprasadController],
  providers: [MahaprasadService],
  exports: [MahaprasadService],
})
export class MahaprasadModule {}
