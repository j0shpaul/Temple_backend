import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";

export class CreateGurukulDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templeId?: string;

  @ApiProperty({
    example: "Shree Neelkantheshwar Mahadev Ved Vedang Gurukulam",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  about?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  philosophy?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  admissionInfo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactInfo?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  rules?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
