import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, Matches } from "class-validator";

export class AskQuestionDto {
  @ApiProperty({ example: "Amit Verma" })
  @IsString()
  @IsNotEmpty()
  askerName: string;

  @ApiPropertyOptional({ example: "+919876543210" })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "Phone must be a valid E.164 format number",
  })
  askerPhone?: string;

  @ApiProperty({
    example: "What is the spiritual significance of lighting a Diya in the evening?",
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({ example: "Rituals & Traditions" })
  @IsString()
  @IsOptional()
  category?: string;
}
