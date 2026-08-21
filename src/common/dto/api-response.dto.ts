import { ApiProperty } from "@nestjs/swagger";

export class ApiResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false })
  meta?: Record<string, unknown>;

  @ApiProperty({ required: false })
  error?: {
    code: string;
    message: string;
  };

  static success<T>(
    data: T,
    meta?: Record<string, unknown>,
  ): ApiResponseDto<T> {
    const response = new ApiResponseDto<T>();
    response.success = true;
    response.data = data;
    if (meta) response.meta = meta;
    return response;
  }

  static error(code: string, message: string): ApiResponseDto<null> {
    const response = new ApiResponseDto<null>();
    response.success = false;
    response.error = { code, message };
    return response;
  }
}
