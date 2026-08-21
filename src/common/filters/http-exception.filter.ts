import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiResponseDto } from "../dto/api-response.dto";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let code: string;

    if (typeof exceptionResponse === "string") {
      message = exceptionResponse;
      code = exception.name.toUpperCase().replace("EXCEPTION", "");
    } else if (
      typeof exceptionResponse === "object" &&
      exceptionResponse !== null
    ) {
      const resp = exceptionResponse as Record<string, unknown>;
      message = (resp.message as string) || exception.message;
      code =
        (resp.error as string) ||
        exception.name.toUpperCase().replace("EXCEPTION", "");
      if (Array.isArray(resp.message)) {
        message = resp.message.join(", ");
      }
    } else {
      message = exception.message;
      code = exception.name.toUpperCase().replace("EXCEPTION", "");
    }

    const errorResponse = ApiResponseDto.error(code, message);
    response.status(status).json(errorResponse);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      let message = exception.message;
      let code = exception.name.toUpperCase().replace("EXCEPTION", "");

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (resp.message) {
          message = Array.isArray(resp.message)
            ? resp.message.join(", ")
            : (resp.message as string);
        }
        if (resp.error) {
          code = resp.error as string;
        }
      } else if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      }

      return response.status(status).json(ApiResponseDto.error(code, message));
    }

    console.error("Unhandled exception:", exception);

    const errorResponse = ApiResponseDto.error(
      "INTERNAL_SERVER_ERROR",
      "An unexpected error occurred.",
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
}
