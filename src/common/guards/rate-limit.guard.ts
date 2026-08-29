import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { RedisService } from "../../modules/redis/redis.service";
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from "../decorators/rate-limit.decorator";

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no rate limit decorator is present on the route, allow request
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const clientIp = this.getClientIp(req);
    const routeIdentifier =
      options.keyPrefix || req.route?.path || req.path || "global";
    const redisKey = `ratelimit:${routeIdentifier}:${clientIp}`;

    try {
      // Atomic increment in Redis
      const current = await this.redis.incr(redisKey);

      if (current === 1) {
        // First request in this window, set expiry
        await this.redis.expire(redisKey, options.durationSeconds);
      }

      let ttl = await this.redis.ttl(redisKey);
      if (ttl < 0) ttl = options.durationSeconds;

      const remaining = Math.max(0, options.points - current);

      // Set RFC standard rate limit headers
      if (res && res.setHeader) {
        res.setHeader("X-RateLimit-Limit", String(options.points));
        res.setHeader("X-RateLimit-Remaining", String(remaining));
        res.setHeader("X-RateLimit-Reset", String(ttl));
      }

      if (current > options.points) {
        if (res && res.setHeader) {
          res.setHeader("Retry-After", String(ttl));
        }

        this.logger.warn(
          `Rate limit exceeded for IP: ${clientIp} on route: ${routeIdentifier} (${current}/${options.points})`,
        );

        throw new HttpException(
          {
            success: false,
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: `Too many requests. Please retry after ${ttl} seconds.`,
            },
            meta: {
              retryAfterSeconds: ttl,
              limit: options.points,
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Rate limit Redis check failed for ${clientIp}: ${error.message}`,
      );

      // Fail-closed for sensitive endpoints, fail-open for public non-critical
      if (options.failClosed) {
        throw new HttpException(
          {
            success: false,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Rate limiting verification temporarily unavailable.",
            },
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Fail open with log warning
      return true;
    }
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || "127.0.0.1";
  }
}
