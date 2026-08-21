import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";

import { AppModule } from "./app.module";
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
} from "./common/filters/http-exception.filter";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { ValidationPipe as CustomValidationPipe } from "./common/pipes/validation.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  let corsOrigin: any;
  if (process.env.CORS_ORIGINS) {
    if (process.env.CORS_ORIGINS === "*") {
      corsOrigin = true;
    } else if (process.env.CORS_ORIGINS.includes(",")) {
      corsOrigin = process.env.CORS_ORIGINS.split(",").map((s) => s.trim());
    } else {
      corsOrigin = process.env.CORS_ORIGINS;
    }
  } else {
    corsOrigin = process.env.NODE_ENV === "production" ? false : true;
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.setGlobalPrefix(process.env.API_PREFIX || "api/v1");

  app.useGlobalPipes(new CustomValidationPipe());

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
    new AllExceptionsFilter(),
  );

  const config = new DocumentBuilder()
    .setTitle("Temple Digital Platform API")
    .setDescription(
      "Comprehensive RESTful Backend API for Temple Digital Platform (Devotee & Admin Panel)",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .addTag(
      "Pages",
      "Page-level read aggregations (BFF layer for Home, About, Darshan, Puja, Seva, Events, Prasad, Accommodation, Donations, Overview)",
    )
    .addTag("Health", "System health & readiness probes")
    .addTag("Auth", "OTP authentication & JWT token management")
    .addTag("Users", "User profile & address management")
    .addTag("Temples", "Temple metadata & information")
    .addTag("Deities", "Temple deities management")
    .addTag("Gallery", "Media & photo gallery")
    .addTag("Darshan", "Darshan schedules & real-time slot availability")
    .addTag("Aarti", "Daily aarti schedules & timings")
    .addTag("Puja", "Puja ceremonies & slot booking")
    .addTag("Seva", "Temple seva offerings & reservations")
    .addTag("Bookings", "Unified booking engine for Puja, Seva & Darshan")
    .addTag("Payments", "Razorpay integration, payment verification & webhooks")
    .addTag("Donations", "Causes, online donations & receipt generation")
    .addTag("Prasad", "Prasad catalog, inventory & online delivery orders")
    .addTag("Accommodation", "Guest house room inventory & booking management")
    .addTag("Events", "Temple festivals, events & registrations")
    .addTag("Notifications", "User notifications & temple announcements")
    .addTag("QR", "Cryptographic QR generation & real-time entry check-in")
    .addTag(
      "Admin",
      "Admin dashboard, crowd analytics, audit logs & management",
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, "0.0.0.0");

  console.log(`Application running on http://0.0.0.0:${port}`);
  console.log(`Swagger docs available at http://0.0.0.0:${port}/docs`);
}

bootstrap();
