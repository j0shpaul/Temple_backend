import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Msg91SmsProvider } from "./msg91-sms.provider";

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private configService: ConfigService,
    private msg91Provider: Msg91SmsProvider,
  ) {}

  async sendOtp(phone: string, otp: string): Promise<void> {
    const providerType =
      this.configService.get<string>("SMS_PROVIDER") ||
      (process.env.NODE_ENV === "production" ? "msg91" : "mock");

    if (process.env.NODE_ENV === "production" || providerType === "msg91") {
      const success = await this.msg91Provider.sendOtp(phone, otp);
      if (!success) {
        throw new InternalServerErrorException(
          "Failed to dispatch OTP SMS via provider. Please try again.",
        );
      }
      return;
    }

    // Mock / non-production provider
    this.logger.log(
      `[SMS MOCK DISPATCH] Phone: ${phone.substring(0, 5)}*** (Dev mode active)`,
    );
  }
}
