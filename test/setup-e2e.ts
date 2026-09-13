import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';
import { ValidationPipe as CustomValidationPipe } from '../src/common/pipes/validation.pipe';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

let app: INestApplication;
let prisma: PrismaService;
let redis: RedisService;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new CustomValidationPipe());
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
    new AllExceptionsFilter(),
  );

  await app.init();

  prisma = moduleFixture.get<PrismaService>(PrismaService);
  redis = moduleFixture.get<RedisService>(RedisService);

  // Clear stale rate limit and OTP keys for test isolation
  try {
    const keys = await redis.keys('*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (e) {
    // Ignore if keys is empty
  }
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (prisma) {
    await prisma.$disconnect();
  }
});

export { app, prisma, redis };