import { Module } from "@nestjs/common";

import { DarshanService } from "./darshan.service";
import { DarshanController } from "./darshan.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [DarshanController],
  providers: [DarshanService],
  exports: [DarshanService],
})
export class DarshanModule {}
