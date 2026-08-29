import * as Joi from "joi";

const INSECURE_DEFAULT_SECRETS = [
  "dev-secret-change-in-production-min-32-chars-long-enough",
  "replace_with_min_32_characters_random_string_here",
  "replace_with_min_32_characters_refresh_secret_here",
  "super_secret_jwt_key_at_least_32_chars_long",
  "super_secret_refresh_jwt_key_at_least_32_chars_long",
  "12345678901234567890123456789012",
];

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default("api/v1"),
  CORS_ORIGINS: Joi.string().allow("").optional(),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().allow("").optional(),
  REDIS_URL: Joi.string().default("redis://localhost:6379"),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default("7d"),

  OTP_EXPIRY_MINUTES: Joi.number().default(5),
  OTP_LENGTH: Joi.number().default(6),
  DEV_OTP: Joi.string().default("123456"),

  // SMS Configuration (MSG91 for production in India)
  SMS_PROVIDER: Joi.string()
    .valid("msg91", "mock", "none")
    .default("none"),
  MSG91_AUTH_KEY: Joi.string().allow("").optional(),
  MSG91_SENDER_ID: Joi.string().allow("").optional(),
  MSG91_DLT_TE_ID: Joi.string().allow("").optional(),

  // Cashfree Payment Gateway Configuration
  CASHFREE_APP_ID: Joi.string().allow("").optional(),
  CASHFREE_SECRET_KEY: Joi.string().allow("").optional(),
  CASHFREE_WEBHOOK_SECRET: Joi.string().allow("").optional(),
  CASHFREE_ENVIRONMENT: Joi.string()
    .valid("sandbox", "production")
    .default("sandbox"),

  // Object Storage Configuration
  STORAGE_PROVIDER: Joi.string()
    .valid("s3", "cloudinary", "local_mock")
    .default("local_mock"),
  S3_BUCKET_NAME: Joi.string().allow("").optional(),
  S3_ENDPOINT: Joi.string().allow("").optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow("").optional(),
  CLOUDINARY_API_KEY: Joi.string().allow("").optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow("").optional(),

  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "info", "debug", "trace")
    .default("info"),
})
  .options({ abortEarly: false, allowUnknown: true })
  .custom((value, helpers) => {
    if (value.NODE_ENV === "production") {
      // 1. JWT Secrets Security Checks
      if (INSECURE_DEFAULT_SECRETS.includes(value.JWT_SECRET)) {
        return helpers.message({
          custom:
            "Production JWT_SECRET cannot use default or weak development secret string",
        });
      }
      if (!value.JWT_REFRESH_SECRET) {
        return helpers.message({
          custom: "Production requires JWT_REFRESH_SECRET to be configured",
        });
      }
      if (INSECURE_DEFAULT_SECRETS.includes(value.JWT_REFRESH_SECRET)) {
        return helpers.message({
          custom:
            "Production JWT_REFRESH_SECRET cannot use default or weak development secret string",
        });
      }
      if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
        return helpers.message({
          custom:
            "JWT_SECRET and JWT_REFRESH_SECRET must be distinct random secrets",
        });
      }

      // 2. CORS Security Checks
      if (!value.CORS_ORIGINS || value.CORS_ORIGINS.trim() === "*") {
        return helpers.message({
          custom:
            "Production CORS_ORIGINS must be set to explicit trusted origins (wildcard '*' is forbidden)",
        });
      }

      // 3. Cashfree Payment Gateway Production Checks
      if (!value.CASHFREE_APP_ID || value.CASHFREE_APP_ID.includes("TEST_dummy")) {
        return helpers.message({
          custom: "Production requires valid CASHFREE_APP_ID",
        });
      }
      if (
        !value.CASHFREE_SECRET_KEY ||
        value.CASHFREE_SECRET_KEY.includes("dummy_secret")
      ) {
        return helpers.message({
          custom: "Production requires valid CASHFREE_SECRET_KEY",
        });
      }
      if (
        !value.CASHFREE_WEBHOOK_SECRET ||
        value.CASHFREE_WEBHOOK_SECRET.includes("dummy_webhook")
      ) {
        return helpers.message({
          custom: "Production requires valid CASHFREE_WEBHOOK_SECRET",
        });
      }
      if (value.CASHFREE_ENVIRONMENT !== "production") {
        return helpers.message({
          custom:
            "Production mode requires CASHFREE_ENVIRONMENT=production",
        });
      }

      // 4. SMS Provider Checks if MSG91 is enabled
      if (value.SMS_PROVIDER === "msg91") {
        if (!value.MSG91_AUTH_KEY || !value.MSG91_SENDER_ID || !value.MSG91_DLT_TE_ID) {
          return helpers.message({
            custom:
              "MSG91 SMS provider requires MSG91_AUTH_KEY, MSG91_SENDER_ID, and MSG91_DLT_TE_ID",
          });
        }
      }

      // 5. Storage Provider Checks if S3 or Cloudinary is enabled
      if (value.STORAGE_PROVIDER === "s3" && !value.S3_BUCKET_NAME) {
        return helpers.message({
          custom: "S3 storage provider requires S3_BUCKET_NAME",
        });
      }
      if (
        value.STORAGE_PROVIDER === "cloudinary" &&
        (!value.CLOUDINARY_CLOUD_NAME ||
          !value.CLOUDINARY_API_KEY ||
          !value.CLOUDINARY_API_SECRET)
      ) {
        return helpers.message({
          custom:
            "Cloudinary storage provider requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET",
        });
      }
    }
    return value;
  });

