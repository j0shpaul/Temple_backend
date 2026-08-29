import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { RateLimitGuard } from "./rate-limit.guard";
import { RedisService } from "../../modules/redis/redis.service";
import { RATE_LIMIT_KEY } from "../decorators/rate-limit.decorator";

describe("RateLimitGuard", () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;
  let redis: RedisService;

  const mockRedis = {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockSetHeader = jest.fn();
  const mockContext = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        headers: { "x-forwarded-for": "103.21.244.2" },
        path: "/api/v1/auth/send-otp",
        route: { path: "/api/v1/auth/send-otp" },
      }),
      getResponse: jest.fn().mockReturnValue({
        setHeader: mockSetHeader,
      }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    reflector = module.get<Reflector>(Reflector);
    redis = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it("should allow request if no @RateLimit metadata is found", async () => {
    mockReflector.getAllAndOverride.mockReturnValue(null);
    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
    expect(mockRedis.incr).not.toHaveBeenCalled();
  });

  it("should allow request within rate limit points and set headers", async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      points: 5,
      durationSeconds: 60,
    });
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue("OK");
    mockRedis.ttl.mockResolvedValue(60);

    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockRedis.incr).toHaveBeenCalledWith(
      expect.stringContaining("ratelimit:"),
    );
    expect(mockRedis.expire).toHaveBeenCalledWith(
      expect.stringContaining("ratelimit:"),
      60,
    );
    expect(mockSetHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "5");
    expect(mockSetHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "4");
  });

  it("should block request when points are exceeded (429 Too Many Requests)", async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      points: 5,
      durationSeconds: 60,
    });
    mockRedis.incr.mockResolvedValue(6);
    mockRedis.ttl.mockResolvedValue(45);

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      HttpException,
    );
    expect(mockSetHeader).toHaveBeenCalledWith("Retry-After", "45");
  });

  it("should fail-closed on sensitive endpoint when Redis fails", async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      points: 5,
      durationSeconds: 60,
      failClosed: true,
    });
    mockRedis.incr.mockRejectedValue(new Error("Redis connection dropped"));

    await expect(guard.canActivate(mockContext)).rejects.toThrow(
      new HttpException(
        {
          success: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Rate limiting verification temporarily unavailable.",
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
    );
  });

  it("should fail-open on non-sensitive endpoint when Redis fails", async () => {
    mockReflector.getAllAndOverride.mockReturnValue({
      points: 20,
      durationSeconds: 60,
      failClosed: false,
    });
    mockRedis.incr.mockRejectedValue(new Error("Redis connection dropped"));

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
