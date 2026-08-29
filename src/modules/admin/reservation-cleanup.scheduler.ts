import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AdminService } from "./admin.service";
import { RedisService } from "../redis/redis.service";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class ReservationCleanupScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ReservationCleanupScheduler.name);
  private readonly instanceId = uuidv4();
  private intervalTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  private readonly LOCK_KEY = "lock:reservation_cleanup";
  private readonly LOCK_TTL_SECONDS = 180; // 3 minutes lock
  private readonly DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CUTOFF_MINUTES = 30; // 30 minutes expiration cutoff

  constructor(
    private adminService: AdminService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const isTest = process.env.NODE_ENV === "test";
    if (isTest) {
      // Do not run auto-interval in unit tests
      return;
    }

    const intervalMs =
      this.configService.get<number>("CLEANUP_INTERVAL_MS") ||
      this.DEFAULT_INTERVAL_MS;

    this.logger.log(
      `Starting ReservationCleanupScheduler on instance ${this.instanceId} with interval ${intervalMs / 1000}s`,
    );

    // Run initial cleanup after 10s warmup
    setTimeout(() => {
      this.runCleanupCycle().catch((err) =>
        this.logger.error(`Initial reservation cleanup error: ${err.message}`),
      );
    }, 10000);

    // Start recurring interval
    this.intervalTimer = setInterval(() => {
      this.runCleanupCycle().catch((err) =>
        this.logger.error(`Periodic reservation cleanup error: ${err.message}`),
      );
    }, intervalMs);
  }

  onApplicationShutdown() {
    this.isShuttingDown = true;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      this.logger.log("ReservationCleanupScheduler stopped");
    }
  }

  async runCleanupCycle(): Promise<{ executed: boolean; cleaned?: number }> {
    if (this.isShuttingDown) return { executed: false };

    let lockAcquired = false;
    try {
      // Distributed lock via Redis atomic SET NX EX
      const lockResult = await this.redis.set(
        this.LOCK_KEY,
        this.instanceId,
        "EX",
        this.LOCK_TTL_SECONDS,
        "NX",
      );

      lockAcquired = lockResult === "OK";
      if (!lockAcquired) {
        this.logger.debug(
          `Cleanup cycle skipped on instance ${this.instanceId}; another instance holds lock`,
        );
        return { executed: false };
      }

      this.logger.log(
        `Acquired cleanup lock on instance ${this.instanceId}; releasing holds older than ${this.CUTOFF_MINUTES}m...`,
      );

      const result = await this.adminService.cleanupExpiredReservations(
        this.CUTOFF_MINUTES,
      );

      this.logger.log(
        `Cleanup cycle complete: ${result.data?.totalCleaned || 0} expired holds released (Bookings: ${result.data?.expiredBookings || 0}, Prasad: ${result.data?.expiredPrasad || 0}, Accommodation: ${result.data?.expiredAccommodations || 0})`,
      );

      return {
        executed: true,
        cleaned: result.data?.totalCleaned || 0,
      };
    } catch (error: any) {
      this.logger.error(`Error during reservation cleanup cycle: ${error.message}`);
      return { executed: false };
    } finally {
      if (lockAcquired) {
        try {
          // Release lock only if we still hold it
          const currentLockHolder = await this.redis.get(this.LOCK_KEY);
          if (currentLockHolder === this.instanceId) {
            await this.redis.del(this.LOCK_KEY);
          }
        } catch {
          // Ignore lock release error; will expire automatically after TTL
        }
      }
    }
  }
}
