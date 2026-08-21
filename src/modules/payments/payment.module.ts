import { Module } from "@nestjs/common";

import { PaymentService } from "./payment.service";
import { PaymentController } from "./payment.controller";
import { RazorpayService } from "./razorpay.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, RazorpayService],
  exports: [PaymentService, RazorpayService],
})
export class PaymentModule {}
