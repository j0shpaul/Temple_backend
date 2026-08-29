import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { GurukulAdmissionStatus } from "@prisma/client";

export class UpdateAdmissionDto {
  @ApiPropertyOptional({ enum: GurukulAdmissionStatus })
  @IsEnum(GurukulAdmissionStatus)
  @IsOptional()
  status?: GurukulAdmissionStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
