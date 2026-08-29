import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { JwtRefreshStrategy } from "./strategies/jwt-refresh.strategy";
import { SmsService } from "./sms/sms.service";
import { Msg91SmsProvider } from "./sms/msg91-sms.provider";
import { PrismaModule } from "../prisma/prisma.module";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtRefreshStrategy,
    SmsService,
    Msg91SmsProvider,
  ],
  exports: [AuthService, JwtModule, SmsService],
})
export class AuthModule {}

