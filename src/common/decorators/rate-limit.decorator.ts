import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "RATE_LIMIT_METADATA";

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the duration */
  points: number;
  /** Duration window in seconds */
  durationSeconds: number;
  /** Custom key prefix (defaults to route path) */
  keyPrefix?: string;
  /** Whether Redis failure on this endpoint should fail closed (default true for sensitive endpoints) */
  failClosed?: boolean;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);
