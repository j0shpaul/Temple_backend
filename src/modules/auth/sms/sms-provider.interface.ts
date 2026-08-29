export interface SmsProvider {
  name: string;
  sendOtp(phone: string, otp: string): Promise<boolean>;
}
