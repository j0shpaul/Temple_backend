import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";

import configuration from "./config/configuration";
import { validationSchema } from "./config/validation";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";

import { PrismaModule } from "./modules/prisma/prisma.module";
import { RedisModule } from "./modules/redis/redis.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { TempleModule } from "./modules/temple/temple.module";
import { DeityModule } from "./modules/deity/deity.module";
import { GalleryModule } from "./modules/gallery/gallery.module";
import { DarshanModule } from "./modules/darshan/darshan.module";
import { AartiModule } from "./modules/aarti/aarti.module";
import { PujaModule } from "./modules/puja/puja.module";
import { SevaModule } from "./modules/seva/seva.module";
import { BookingModule } from "./modules/booking/booking.module";
import { PaymentModule } from "./modules/payments/payment.module";
import { DonationModule } from "./modules/donations/donation.module";
import { PrasadModule } from "./modules/prasad/prasad.module";
import { AccommodationModule } from "./modules/accommodation/accommodation.module";
import { EventsModule } from "./modules/events/events.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { QrModule } from "./modules/qr/qr.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PagesModule } from "./modules/pages/pages.module";
import { PaathModule } from "./modules/paath/paath.module";
import { GurukulModule } from "./modules/gurukul/gurukul.module";
import { MahaprasadModule } from "./modules/mahaprasad/mahaprasad.module";
import { JigyasaModule } from "./modules/jigyasa/jigyasa.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: [".env.local", ".env"],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || "info",
        genReqId: (req: any) => req.id || req.headers?.["x-request-id"],
        redact: [
          "req.headers.authorization",
          "req.headers['x-cashfree-signature']",
          "req.headers['x-webhook-signature']",
          "req.body.otp",
          "req.body.refreshToken",
          "req.body.password",
        ],
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty" }
            : undefined,
      },
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TempleModule,
    DeityModule,
    GalleryModule,
    DarshanModule,
    AartiModule,
    PujaModule,
    SevaModule,
    BookingModule,
    PaymentModule,
    DonationModule,
    PrasadModule,
    AccommodationModule,
    EventsModule,
    NotificationsModule,
    QrModule,
    AdminModule,
    PagesModule,
    PaathModule,
    GurukulModule,
    MahaprasadModule,
    JigyasaModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
