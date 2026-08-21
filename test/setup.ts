import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { RedisService } from '../src/modules/redis/redis.service';

let app: INestApplication;
let prisma: PrismaService;
let redis: RedisService;

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();

  prisma = moduleFixture.get<PrismaService>(PrismaService);
  redis = moduleFixture.get<RedisService>(RedisService);
});

afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
  await redis.quit();
});

export { app, prisma, redis };