import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from "class-validator";

export class AnswerQuestionDto {
  @ApiProperty({ description: "Spiritual answer / guidance" })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiPropertyOptional({ description: "Name/title of authority providing the answer" })
  @IsString()
  @IsOptional()
  answeredBy?: string;

  @ApiPropertyOptional({ default: true, description: "Whether to publish to public spiritual Q&A" })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
