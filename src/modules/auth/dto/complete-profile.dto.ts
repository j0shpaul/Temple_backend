import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsDateString } from "class-validator";

export class CompleteProfileDto {
  @ApiProperty({ description: "Full name", example: "Rahul Sharma" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: "Email address", example: "rahul@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "Date of birth (ISO string)", example: "1990-01-15" })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: "Gender", example: "Male" })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: "Emergency contact number", example: "+919876543210" })
  @IsOptional()
  @IsString()
  emergencyContact?: string;
}
