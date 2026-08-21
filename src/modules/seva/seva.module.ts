import { Module } from "@nestjs/common";

import { SevaService } from "./seva.service";
import { SevaController } from "./seva.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SevaController],
  providers: [SevaService],
  exports: [SevaService],
})
export class SevaModule {}
