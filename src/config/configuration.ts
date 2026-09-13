import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3000", 10),
  apiPrefix: process.env.API_PREFIX || "api/v1",
  logLevel: process.env.LOG_LEVEL || "info",
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
    : [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
      ],
  devOtp:
    process.env.NODE_ENV === "production"
      ? null
      : process.env.DEV_OTP || "123456",
  supabase: {
    url: process.env.SUPABASE_URL || "https://slssagurwlrixwzxpkpj.supabase.co",
    anonKey:
      process.env.SUPABASE_ANON_KEY ||
      "sb_publishable_dFbTM7aajNRgvR2ZYS5qTw__Tzf1qYn",
    bucket: process.env.SUPABASE_BUCKET || "temple-media",
  },
}));
