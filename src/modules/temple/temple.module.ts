import { Module } from "@nestjs/common";

import { TempleService } from "./temple.service";
import { TempleController } from "./temple.controller";
import { TempleInfoService } from "./temple-info.service";
import { TempleInfoController } from "./temple-info.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TempleController, TempleInfoController],
  providers: [TempleService, TempleInfoService],
  exports: [TempleService, TempleInfoService],
})
export class TempleModule {}
