import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { ValidationPipe as CustomValidationPipe } from '../src/common/pipes/validation.pipe';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from '../src/common/filters/http-exception.filter';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

let app: INestApplication;
let prisma: PrismaService;

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
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  if (prisma) {
    await prisma.$disconnect();
  }
});

export { app, prisma };