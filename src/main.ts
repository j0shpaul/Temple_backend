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

  // Enable graceful shutdown hooks (SIGTERM, SIGINT)
  app.enableShutdownHooks();

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  let corsOrigin: any;
  if (process.env.NODE_ENV === "production") {
    const originsStr = process.env.CORS_ORIGINS?.trim() || "";
    if (!originsStr || originsStr === "*") {
      throw new Error(
        "PRODUCTION SECURITY ERROR: CORS_ORIGINS must be configured with explicit domain origins in production (wildcard '*' is forbidden).",
      );
    }
    corsOrigin = originsStr.includes(",")
      ? originsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : originsStr;
  } else {
    corsOrigin = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.includes(",")
        ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
        : process.env.CORS_ORIGINS.trim()
      : [
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:8080",
          "http://localhost:8081",
          "http://127.0.0.1:8080",
          "http://127.0.0.1:8081",
          "http://127.0.0.1:5173",
        ];
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-request-id",
      "x-cashfree-signature",
      "x-webhook-signature",
      "x-webhook-timestamp",
    ],
  });

  app.setGlobalPrefix(process.env.API_PREFIX || "api/v1");

  app.useGlobalPipes(new CustomValidationPipe());

  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new PrismaExceptionFilter(),
    new AllExceptionsFilter(),
  );

  const enableSwagger =
    process.env.ENABLE_SWAGGER === "true" ||
    process.env.NODE_ENV !== "production";

  if (enableSwagger) {
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
      .addTag(
        "Payments",
        "Cashfree payment integration, verification, reconciliation & webhooks",
      )
      .addTag("Donations", "Causes, online donations & receipt generation")
      .addTag("Prasad", "Prasad catalog, inventory & online delivery orders")
      .addTag(
        "Accommodation",
        "Guest house room inventory & booking management",
      )
      .addTag("Events", "Temple festivals, events & registrations")
      .addTag("Notifications", "User notifications & temple announcements")
      .addTag("QR", "Cryptographic QR generation & real-time entry check-in")
      .addTag("Paath", "Nitya Paath Shrawan: Vedic Mantras, Shlokas & Chants")
      .addTag(
        "Gurukul",
        "Shree Neelkantheshwar Mahadev Ved Vedang Gurukulam & Admissions",
      )
      .addTag(
        "Mahaprasad",
        "Mahaprasad dining slot management & seat booking",
      )
      .addTag("Jigyasa Samadhan", "Spiritual inquiry & Sanatan Dharma Q&A")
      .addTag(
        "Admin",
        "Admin dashboard, crowd analytics, audit logs & management",
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port, "0.0.0.0");

  console.log(`Application running on http://0.0.0.0:${port}`);
  if (enableSwagger) {
    console.log(`Swagger docs available at http://0.0.0.0:${port}/docs`);
  }
}

bootstrap();
