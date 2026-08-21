import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Database connected");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Database disconnected");
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === "production") {
      throw new Error("cleanDatabase is not allowed in production");
    }
    const service = this as unknown as Record<string, unknown>;
    const models = Reflect.ownKeys(service).filter(
      (key): key is string =>
        typeof key === "string" && !key.startsWith("_") && !key.startsWith("$"),
    );
    for (const model of models) {
      const modelDelegate = service[model];
      if (
        modelDelegate &&
        typeof (modelDelegate as { deleteMany?: unknown }).deleteMany ===
          "function"
      ) {
        await (
          modelDelegate as { deleteMany: () => Promise<unknown> }
        ).deleteMany();
      }
    }
  }
}
