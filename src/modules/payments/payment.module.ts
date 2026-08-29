import { Module } from "@nestjs/common";

import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { CashfreeService } from "./cashfree.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, CashfreeService],
  exports: [PaymentService, CashfreeService],
})
export class PaymentModule {}
