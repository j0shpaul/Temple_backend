import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);

  constructor(configService: ConfigService) {
    super(configService.get<string>("REDIS_URL") || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 20) {
          this.logger.error("Redis max reconnection retries (20) exceeded");
          return null;
        }
        const delay = Math.min(times * 150, 3000);
        return delay;
      },
      lazyConnect: true,
    });
  }

  async onModuleInit() {
    await this.connect();
    this.logger.log("Redis connected");
  }

  async onModuleDestroy() {
    await this.quit();
    this.logger.log("Redis disconnected");
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}
