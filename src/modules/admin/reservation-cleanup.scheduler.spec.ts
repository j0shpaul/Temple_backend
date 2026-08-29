import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ReservationCleanupScheduler } from "./reservation-cleanup.scheduler";
import { AdminService } from "./admin.service";
import { RedisService } from "../redis/redis.service";

describe("ReservationCleanupScheduler", () => {
  let scheduler: ReservationCleanupScheduler;
  let adminService: AdminService;
  let redisService: RedisService;

  const mockAdminService = {
    cleanupExpiredReservations: jest.fn(),
  };

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "CLEANUP_INTERVAL_MS") return 300000;
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationCleanupScheduler,
        { provide: AdminService, useValue: mockAdminService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    scheduler = module.get<ReservationCleanupScheduler>(
      ReservationCleanupScheduler,
    );
    adminService = module.get<AdminService>(AdminService);
    redisService = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(scheduler).toBeDefined();
  });

  it("should execute cleanup cycle when lock is acquired", async () => {
    mockRedisService.set.mockResolvedValue("OK");
    mockAdminService.cleanupExpiredReservations.mockResolvedValue({
      success: true,
      data: {
        totalCleaned: 3,
        expiredBookings: 2,
        expiredPrasad: 1,
        expiredAccommodations: 0,
      },
    });
    mockRedisService.get.mockResolvedValue((scheduler as any).instanceId);

    const result = await scheduler.runCleanupCycle();

    expect(result.executed).toBe(true);
    expect(result.cleaned).toBe(3);
    expect(mockRedisService.set).toHaveBeenCalledWith(
      "lock:reservation_cleanup",
      (scheduler as any).instanceId,
      "EX",
      180,
      "NX",
    );
    expect(mockAdminService.cleanupExpiredReservations).toHaveBeenCalledWith(30);
  });

  it("should skip cleanup cycle when lock is held by another instance", async () => {
    mockRedisService.set.mockResolvedValue(null);

    const result = await scheduler.runCleanupCycle();

    expect(result.executed).toBe(false);
    expect(mockAdminService.cleanupExpiredReservations).not.toHaveBeenCalled();
  });

  it("should gracefully handle errors in cleanup cycle without crashing", async () => {
    mockRedisService.set.mockResolvedValue("OK");
    mockAdminService.cleanupExpiredReservations.mockRejectedValue(
      new Error("Database connection lost"),
    );

    const result = await scheduler.runCleanupCycle();

    expect(result.executed).toBe(false);
  });
});
