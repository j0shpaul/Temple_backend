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
}));
