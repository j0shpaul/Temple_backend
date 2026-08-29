import { Module } from "@nestjs/common";
import { PaathController, AdminPaathController } from "./paath.controller";
import { PaathService } from "./paath.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PaathController, AdminPaathController],
  providers: [PaathService],
  exports: [PaathService],
})
export class PaathModule {}
