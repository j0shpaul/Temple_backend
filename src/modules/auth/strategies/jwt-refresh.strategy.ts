import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

import { RedisService } from "../../redis/redis.service";

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(
    configService: ConfigService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    payload: { sub: string; phone: string; role: string },
  ) {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token not provided");
    }

    const stored = await this.redis.get(`refresh:${refreshToken}`);
    if (!stored || stored !== payload.sub) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    return { userId: payload.sub, refreshToken };
  }
}
