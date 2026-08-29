import { Module } from "@nestjs/common";

import { GalleryService } from "./gallery.service";
import { GalleryController } from "./gallery.controller";
import { MediaUploadService } from "./media-upload.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [GalleryController],
  providers: [GalleryService, MediaUploadService],
  exports: [GalleryService, MediaUploadService],
})
export class GalleryModule {}
