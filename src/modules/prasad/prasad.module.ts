import { Module } from "@nestjs/common";

import { PrasadService } from "./prasad.service";
import { PrasadController } from "./prasad.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { PaymentModule } from "../payments/payment.module";

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [PrasadController],
  providers: [PrasadService],
  exports: [PrasadService],
})
export class PrasadModule {}
