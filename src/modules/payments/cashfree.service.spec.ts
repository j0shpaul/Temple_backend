import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CashfreeService } from "./cashfree.service";
import { createHmac } from "crypto";

describe("CashfreeService", () => {
  let service: CashfreeService;
  let configService: ConfigService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === "CASHFREE_APP_ID") return "TEST_APP_123";
      if (key === "CASHFREE_SECRET_KEY") return "test_secret_key_12345";
      if (key === "CASHFREE_WEBHOOK_SECRET") return "test_secret_key_12345";
      if (key === "CASHFREE_ENVIRONMENT") return "sandbox";
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashfreeService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<CashfreeService>(CashfreeService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should report configured when app ID and secret key are present", () => {
    expect(service.isConfigured()).toBe(true);
    expect(service.getEnvironment()).toBe("sandbox");
  });

  describe("verifyWebhookSignature", () => {
    const secret = "test_secret_key_12345";
    const rawBody = JSON.stringify({
      type: "PAYMENT_SUCCESS_WEBHOOK",
      data: { order_id: "order_1" },
    });
    const timestamp = "1700000000";

    it("should return true for valid HMAC-SHA256 signature with timestamp", () => {
      const payload = `${timestamp}${rawBody}`;
      const validSignature = createHmac("sha256", secret)
        .update(payload)
        .digest("base64");

      const result = service.verifyWebhookSignature(
        validSignature,
        rawBody,
        timestamp,
      );
      expect(result).toBe(true);
    });

    it("should return true for valid hex signature", () => {
      const payload = `${timestamp}${rawBody}`;
      const validHex = createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const result = service.verifyWebhookSignature(
        validHex,
        rawBody,
        timestamp,
      );
      expect(result).toBe(true);
    });

    it("should return false for invalid signature", () => {
      const result = service.verifyWebhookSignature(
        "invalid_signature_xyz",
        rawBody,
        timestamp,
      );
      expect(result).toBe(false);
    });

    it("should return false for empty signature", () => {
      expect(service.verifyWebhookSignature("", rawBody)).toBe(false);
    });
  });

  describe("createOrder", () => {
    it("should return order details from Cashfree API", async () => {
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cf_order_id: 12345,
          order_id: "test_order_123",
          payment_session_id: "session_123",
          order_amount: 500.0,
          order_currency: "INR",
          order_status: "ACTIVE",
          created_at: new Date().toISOString(),
        }),
      } as any);

      const result = await service.createOrder({
        orderId: "test_order_123",
        amount: 50000,
        currency: "INR",
        customerId: "cust_1",
      });

      expect(result).toBeDefined();
      expect(result.orderId).toBe("test_order_123");
      expect(result.paymentSessionId).toBe("session_123");
      expect(result.amount).toBe(50000);
      expect(result.currency).toBe("INR");

      mockFetch.mockRestore();
    });
  });

  describe("fetchOrderStatus", () => {
    it("should return order and payment details", async () => {
      const mockFetch = jest
        .spyOn(global, "fetch")
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            order_id: "test_order_123",
            order_status: "PAID",
            order_amount: 500.0,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            {
              cf_payment_id: "pay_123",
              order_id: "test_order_123",
              payment_status: "SUCCESS",
              payment_amount: 500.0,
            },
          ],
        } as any);

      const result = await service.fetchOrderStatus("test_order_123");

      expect(result.orderStatus).toBe("PAID");
      expect(result.payments).toHaveLength(1);
      expect(result.payments![0].status).toBe("SUCCESS");

      mockFetch.mockRestore();
    });
  });
});
