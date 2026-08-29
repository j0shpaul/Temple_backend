import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const rawHeader =
      req.headers["x-request-id"] || req.headers["x-correlation-id"];
    let requestId: string;

    if (
      typeof rawHeader === "string" &&
      rawHeader.trim().length > 0 &&
      rawHeader.length <= 64 &&
      /^[a-zA-Z0-9_-]+$/.test(rawHeader.trim())
    ) {
      requestId = rawHeader.trim();
    } else {
      requestId = uuidv4();
    }

    req.headers["x-request-id"] = requestId;
    (req as any).id = requestId;
    res.setHeader("x-request-id", requestId);

    next();
  }
}
