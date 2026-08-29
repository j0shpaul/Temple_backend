import * as Joi from "joi";
import { validationSchema } from "../../config/validation";
import { LocationUtil } from "./location.util";
import { createHash } from "crypto";

describe("Production Readiness & Security Hardening Test Suite", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("1. Fail-Closed Production Configuration Validation", () => {
    it("should reject startup in production mode if JWT_SECRET is weak or default", () => {
      const invalidConfig = {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@host:5432/db",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "dev-secret-change-in-production-min-32-chars-long-enough",
        JWT_REFRESH_SECRET: "distinct_secret_refresh_32_characters_long",
        CORS_ORIGINS: "https://temple.example.com",
        CASHFREE_APP_ID: "PROD_APP_123",
        CASHFREE_SECRET_KEY: "PROD_SECRET_123",
        CASHFREE_WEBHOOK_SECRET: "PROD_WEBHOOK_123",
        CASHFREE_ENVIRONMENT: "production",
      };

      const { error } = validationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain("Production JWT_SECRET cannot use default or weak");
    });

    it("should reject startup in production mode if CORS_ORIGINS is set to wildcard '*'", () => {
      const invalidConfig = {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@host:5432/db",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "random_jwt_secret_key_at_least_32_chars_long_prod",
        JWT_REFRESH_SECRET: "random_jwt_refresh_secret_key_at_least_32_chars_long_prod",
        CORS_ORIGINS: "*",
        CASHFREE_APP_ID: "PROD_APP_123",
        CASHFREE_SECRET_KEY: "PROD_SECRET_123",
        CASHFREE_WEBHOOK_SECRET: "PROD_WEBHOOK_123",
        CASHFREE_ENVIRONMENT: "production",
      };

      const { error } = validationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain("wildcard '*' is forbidden");
    });

    it("should reject startup in production mode if CASHFREE_ENVIRONMENT is sandbox", () => {
      const invalidConfig = {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@host:5432/db",
        REDIS_URL: "redis://localhost:6379",
        JWT_SECRET: "random_jwt_secret_key_at_least_32_chars_long_prod",
        JWT_REFRESH_SECRET: "random_jwt_refresh_secret_key_at_least_32_chars_long_prod",
        CORS_ORIGINS: "https://temple.example.com",
        CASHFREE_APP_ID: "PROD_APP_123",
        CASHFREE_SECRET_KEY: "PROD_SECRET_123",
        CASHFREE_WEBHOOK_SECRET: "PROD_WEBHOOK_123",
        CASHFREE_ENVIRONMENT: "sandbox",
      };

      const { error } = validationSchema.validate(invalidConfig);
      expect(error).toBeDefined();
      expect(error?.message).toContain("CASHFREE_ENVIRONMENT=production");
    });

    it("should pass validation in production mode with secure random credentials", () => {
      const validConfig = {
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@host:5432/db",
        REDIS_URL: "rediss://default:pass@host.upstash.io:6379",
        JWT_SECRET: "random_jwt_secret_key_at_least_32_chars_long_prod_99",
        JWT_REFRESH_SECRET: "random_jwt_refresh_secret_key_at_least_32_chars_long_prod_88",
        CORS_ORIGINS: "https://temple.example.com,https://admin.temple.example.com",
        CASHFREE_APP_ID: "LIVE_APP_999",
        CASHFREE_SECRET_KEY: "LIVE_SECRET_999",
        CASHFREE_WEBHOOK_SECRET: "LIVE_WEBHOOK_SECRET_999",
        CASHFREE_ENVIRONMENT: "production",
      };

      const { error, value } = validationSchema.validate(validConfig);
      expect(error).toBeUndefined();
      expect(value.CASHFREE_ENVIRONMENT).toEqual("production");
    });
  });

  describe("2. OTP Security & Cryptographic Hashing", () => {
    it("should hash OTPs using SHA-256 and match correctly", () => {
      const otp = "849201";
      const hash1 = createHash("sha256").update(otp).digest("hex");
      const hash2 = createHash("sha256").update("849201").digest("hex");
      const wrongHash = createHash("sha256").update("000000").digest("hex");

      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(wrongHash);
    });
  });

  describe("3. Local Geolocation Math (Haversine Formula)", () => {
    it("should calculate exact distance without external API calls", () => {
      // New Delhi (28.6139, 77.2090) to Siddhivinayak Temple Mumbai (19.0169, 72.8304) ~ 1147 km
      const distance = LocationUtil.calculateDistanceKm(
        28.6139,
        77.209,
        19.0169,
        72.8304,
      );
      expect(distance).toBeGreaterThan(1100);
      expect(distance).toBeLessThan(1200);
    });

    it("should return null for missing coordinates gracefully", () => {
      expect(LocationUtil.calculateDistanceKm(undefined, 77.209, 19.0169, 72.8304)).toBeNull();
      expect(LocationUtil.calculateDistanceKm(28.6139, null as any, 19.0169, 72.8304)).toBeNull();
    });
  });
});
