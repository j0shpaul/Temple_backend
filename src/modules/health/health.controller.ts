import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
  HealthIndicatorFunction,
} from "@nestjs/terminus";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  liveness(): Promise<HealthCheckResult> {
    return this.health.check([this.appIndicator()]);
  }

  @Get("ready")
  @HealthCheck()
  async readiness(): Promise<HealthCheckResult> {
    return this.health.check([this.databaseIndicator(), this.redisIndicator()]);
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
