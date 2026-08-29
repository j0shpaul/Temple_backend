import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
} from "class-validator";

export class CreateMahaprasadSlotDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templeId?: string;

  @ApiProperty({ example: "Madhyahna Mahaprasad (Lunch)" })
  @IsString()
  @IsNotEmpty()
  sessionName: string;

  @ApiProperty({ example: "2026-08-25" })
  @IsDateString()
  date: string;

  @ApiProperty({ example: "12:00 PM" })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: "02:00 PM" })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ default: 100, example: 100 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({ default: 0, description: "Price in paise (0 = free / token)" })
  @IsInt()
  @Min(0)
  @IsOptional()
  pricePerPersonPaise?: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
