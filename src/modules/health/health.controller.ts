import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorFunction,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private healthCheck: HealthCheckService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: "System health check (App, DB & Redis)" })
  @ApiResponse({ status: 200, description: "System status health report" })
  health(): Promise<HealthCheckResult> {
    return this.healthCheck.check([
      this.appIndicator(),
      this.databaseIndicator(),
      this.redisIndicator(),
    ]);
  }

  @Get("live")
  @HealthCheck()
  @ApiOperation({ summary: "Application liveness probe" })
  @ApiResponse({ status: 200, description: "Application liveness status" })
  liveness(): Promise<HealthCheckResult> {
    return this.healthCheck.check([this.appIndicator()]);
  }

  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Database and Redis readiness probe" })
  @ApiResponse({ status: 200, description: "Infrastructure readiness status" })
  async readiness(): Promise<HealthCheckResult> {
    return this.healthCheck.check([
      this.databaseIndicator(),
      this.redisIndicator(),
    ]);
  }

  private appIndicator(): HealthIndicatorFunction {
    return async () => ({ app: { status: "up" } }) as any;
  }

  private databaseIndicator(): HealthIndicatorFunction {
    return async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { database: { status: "up" } } as any;
      } catch {
        return { database: { status: "down" } } as any;
      }
    };
  }

  private redisIndicator(): HealthIndicatorFunction {
    return async () => {
      try {
        const healthy = await this.redis.healthCheck();
        return { redis: { status: healthy ? "up" : "down" } } as any;
      } catch {
        return { redis: { status: "down" } } as any;
      }
    };
  }
}
