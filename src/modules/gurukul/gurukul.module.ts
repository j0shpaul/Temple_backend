import { Module } from "@nestjs/common";
import {
  GurukulController,
  AdminGurukulController,
} from "./gurukul.controller";
import { GurukulService } from "./gurukul.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [GurukulController, AdminGurukulController],
  providers: [GurukulService],
  exports: [GurukulService],
})
export class GurukulModule {}
