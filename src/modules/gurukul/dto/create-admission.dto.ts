import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
} from "class-validator";

export class CreateAdmissionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gurukulId?: string;

  @ApiProperty({ example: "Aarav Sharma" })
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @ApiProperty({ example: "Ramesh Sharma" })
  @IsString()
  @IsNotEmpty()
  guardianName: string;

  @ApiProperty({ example: "+919876543210" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "Phone must be a valid E.164 format number",
  })
  phone: string;

  @ApiPropertyOptional({ example: "parent@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "2012-05-15" })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: "Class 5 passed" })
  @IsString()
  @IsOptional()
  previousEducation?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: "Seeking admission for Vedic studies" })
  @IsString()
  @IsOptional()
  message?: string;
}
