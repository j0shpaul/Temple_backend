import * as Joi from "joi";

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default("api/v1"),
  CORS_ORIGINS: Joi.string().allow("").optional(),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default("redis://localhost:6379"),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default("7d"),
  OTP_EXPIRY_MINUTES: Joi.number().default(5),
  OTP_LENGTH: Joi.number().default(6),
  DEV_OTP: Joi.string().default("123456"),
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow("").optional(),
  FIREBASE_PROJECT_ID: Joi.string().allow("").optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().allow("").optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().allow("").optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow("").optional(),
  CLOUDINARY_API_KEY: Joi.string().allow("").optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow("").optional(),
  LOG_LEVEL: Joi.string()
    .valid("fatal", "error", "warn", "info", "debug", "trace")
    .default("info"),
}).options({ abortEarly: false, allowUnknown: true });
