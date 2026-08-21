import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ApiResponseDto } from "../dto/api-response.dto";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "DATABASE_ERROR";
    let message = "A database error occurred.";

    switch (exception.code) {
      case "P2002": {
        const target =
          (exception.meta?.target as string[])?.join(", ") || "field";
        status = HttpStatus.CONFLICT;
        code = "UNIQUE_CONSTRAINT_VIOLATION";
        message = `A record with this ${target} already exists.`;
        break;
      }
      case "P2025": {
        status = HttpStatus.NOT_FOUND;
        code = "NOT_FOUND";
        message = "The requested record was not found.";
        break;
      }
      case "P2003": {
        status = HttpStatus.BAD_REQUEST;
        code = "FOREIGN_KEY_CONSTRAINT";
        message = "Invalid reference: related record does not exist.";
        break;
      }
      case "P2014": {
        status = HttpStatus.BAD_REQUEST;
        code = "RELATION_VIOLATION";
        message = "The change would violate a required relation.";
        break;
      }
      default:
        console.error(
          "Unhandled Prisma error:",
          exception.code,
          exception.message,
        );
    }

    const errorResponse = ApiResponseDto.error(code, message);
    response.status(status).json(errorResponse);
  }
}
