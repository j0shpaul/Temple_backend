import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
} from "class-validator";

export class CreatePaathDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  templeId?: string;

  @ApiProperty({ description: "Title of the Shloka / Paath" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: "Original Sanskrit text / Mantra" })
  @IsString()
  @IsNotEmpty()
  sanskritText: string;

  @ApiProperty({ description: "Roman / Hindi transliteration for chanting" })
  @IsString()
  @IsNotEmpty()
  transliteration: string;

  @ApiProperty({ description: "Hindi translation and meaning" })
  @IsString()
  @IsNotEmpty()
  hindiMeaning: string;

  @ApiPropertyOptional({ description: "English translation and meaning" })
  @IsString()
  @IsOptional()
  englishMeaning?: string;

  @ApiPropertyOptional({ description: "Audio streaming URL" })
  @IsString()
  @IsOptional()
  audioUrl?: string;

  @ApiPropertyOptional({ description: "Duration in seconds" })
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ description: "Category e.g. Vedic Mantra, Stotram, Aarti" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @IsOptional()
  displayOrder?: number;
}
