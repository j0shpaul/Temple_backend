import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from "@nestjs/common";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { ApiResponseDto } from "../dto/api-response.dto";

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((err) =>
        Object.values(err.constraints || {}),
      );
      throw new BadRequestException(
        ApiResponseDto.error("VALIDATION_ERROR", messages.join(", ")),
      );
    }

    return object;
  }

  private toValidate(metatype: new (...args: any[]) => any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype as any);
  }
}
