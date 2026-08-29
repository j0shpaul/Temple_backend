import { PartialType } from "@nestjs/swagger";
import { CreatePaathDto } from "./create-paath.dto";

export class UpdatePaathDto extends PartialType(CreatePaathDto) {}
