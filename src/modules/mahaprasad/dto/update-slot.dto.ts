import { PartialType } from "@nestjs/swagger";
import { CreateMahaprasadSlotDto } from "./create-slot.dto";

export class UpdateMahaprasadSlotDto extends PartialType(CreateMahaprasadSlotDto) {}
