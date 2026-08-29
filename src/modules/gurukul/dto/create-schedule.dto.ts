import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
} from "class-validator";

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  gurukulId: string;

  @ApiProperty({ example: "Pratah Smaran" })
  @IsString()
  @IsNotEmpty()
  activityName: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: "04:00 AM" })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiPropertyOptional({ example: "05:00 AM" })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
