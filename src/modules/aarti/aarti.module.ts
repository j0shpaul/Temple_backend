import { Module } from "@nestjs/common";

import { AartiService } from "./aarti.service";
import { AartiController } from "./aarti.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [AartiController],
  providers: [AartiService],
  exports: [AartiService],
})
export class AartiModule {}
