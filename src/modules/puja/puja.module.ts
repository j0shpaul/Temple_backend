import { Module } from "@nestjs/common";

import { PujaService } from "./puja.service";
import { PujaController } from "./puja.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [PujaController],
  providers: [PujaService],
  exports: [PujaService],
})
export class PujaModule {}
