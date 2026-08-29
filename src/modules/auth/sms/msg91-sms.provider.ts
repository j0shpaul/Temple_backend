import { Injectable, Logger, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SmsProvider } from "./sms-provider.interface";

@Injectable()
export class Msg91SmsProvider implements SmsProvider {
  name = "msg91";
  private readonly logger = new Logger(Msg91SmsProvider.name);

  private authKey: string;
  private senderId: string;
  private templateId: string;

  constructor(private configService: ConfigService) {
    this.authKey = this.configService.get<string>("MSG91_AUTH_KEY") || "";
    this.senderId = this.configService.get<string>("MSG91_SENDER_ID") || "";
    this.templateId = this.configService.get<string>("MSG91_DLT_TE_ID") || "";
  }

  isConfigured(): boolean {
    return Boolean(this.authKey && this.senderId && this.templateId);
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException(
          "MSG91 SMS credentials are not properly configured in production",
        );
      }
      this.logger.warn("MSG91 credentials missing; skipping physical SMS in non-production mode");
      return true;
    }

    // Format phone number for India DLT (strip leading '+' for MSG91 mobile parameter)
    let formattedPhone = phone.replace(/\+/g, "");
    if (!formattedPhone.startsWith("91") && formattedPhone.length === 10) {
      formattedPhone = `91${formattedPhone}`;
    }

    const url = `https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(
      this.templateId,
    )}&mobile=${encodeURIComponent(formattedPhone)}&authkey=${encodeURIComponent(
      this.authKey,
    )}`;

    const payload = {
      otp: otp,
      sender: this.senderId,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: this.authKey,
        },
        body: JSON.stringify(payload),
      });

      const responseData = (await response.json()) as any;

      if (!response.ok || responseData?.type === "error") {
        this.logger.error(
          `MSG91 OTP dispatch failed for phone [${phone.substring(0, 5)}***]: ${
            responseData?.message || response.statusText
          }`,
        );
        return false;
      }

      this.logger.log(`MSG91 OTP successfully dispatched to recipient phone [${phone.substring(0, 5)}***]`);
      return true;
    } catch (error: any) {
      this.logger.error(`MSG91 API request network error: ${error.message}`);
      return false;
    }
  }
}
