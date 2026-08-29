import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
} from "class-validator";

export class BookMahaprasadDto {
  @ApiProperty({ description: "Mahaprasad Slot ID" })
  @IsString()
  @IsNotEmpty()
  slotId: string;

  @ApiProperty({ default: 1, example: 2 })
  @IsInt()
  @Min(1)
  @Max(20)
  numberOfPeople: number;

  @ApiProperty({ example: "Ramesh Sharma" })
  @IsString()
  @IsNotEmpty()
  devoteeName: string;

  @ApiProperty({ example: "+919876543210" })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "Phone must be a valid E.164 format number",
  })
  devoteePhone: string;
}
