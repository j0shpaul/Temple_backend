import { Module } from "@nestjs/common";
import {
  JigyasaController,
  AdminJigyasaController,
} from "./jigyasa.controller";
import { JigyasaService } from "./jigyasa.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [JigyasaController, AdminJigyasaController],
  providers: [JigyasaService],
  exports: [JigyasaService],
})
export class JigyasaModule {}
