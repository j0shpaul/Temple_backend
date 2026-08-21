import { randomBytes } from "crypto";

export class IdUtil {
  static generateId(): string {
    return randomBytes(16).toString("hex");
  }

  static generateShortId(length = 8): string {
    return randomBytes(Math.ceil(length / 2))
      .toString("hex")
      .slice(0, length);
  }

  static generateQRToken(): string {
    return randomBytes(32).toString("base64url");
  }

  static generateOTP(length = 6): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  static generateBookingReference(prefix = "BK"): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  static generateOrderReference(): string {
    const prefix = "ORD";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  static generateReceiptNumber(): string {
    const prefix = "RCT";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomBytes(3).toString("hex").toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}
