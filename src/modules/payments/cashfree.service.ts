import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac } from "crypto";
import {
  PaymentGateway,
  CreateOrderInput,
  PaymentOrder,
  PaymentDetails,
  RefundDetails,
} from "./razorpay.interface";

@Injectable()
export class CashfreeService implements PaymentGateway {
  name = "cashfree";
  private readonly logger = new Logger(CashfreeService.name);

  private appId: string;
  private secretKey: string;
  private webhookSecret: string;
  private environment: "sandbox" | "production";
  private baseUrl: string;
  private apiVersion = "2023-08-01";

  constructor(private config: ConfigService) {
    this.appId = this.config.get<string>("CASHFREE_APP_ID") || "";
    this.secretKey = this.config.get<string>("CASHFREE_SECRET_KEY") || "";
    this.webhookSecret =
      this.config.get<string>("CASHFREE_WEBHOOK_SECRET") || this.secretKey;
    this.environment =
      this.config.get<string>("CASHFREE_ENVIRONMENT") === "production"
        ? "production"
        : "sandbox";

    this.baseUrl =
      this.environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
  }

  isConfigured(): boolean {
    return Boolean(this.appId && this.secretKey);
  }

  getEnvironment(): string {
    return this.environment;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      "x-api-version": this.apiVersion,
    };
  }

  async createOrder(input: CreateOrderInput): Promise<PaymentOrder> {
    // Amount in INR rupees (Cashfree expects standard decimal INR)
    const amountInRupees = Number((input.amount / 100).toFixed(2));

    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException(
          "Cashfree payment credentials are not configured in production",
        );
      }
      this.logger.warn(
        "Cashfree credentials missing in development; using sandbox fallback",
      );
      return {
        id: input.orderId,
        orderId: input.orderId,
        paymentSessionId: `session_${input.orderId}_${Date.now()}`,
        amount: input.amount,
        currency: input.currency || "INR",
        receipt: input.receipt,
        status: "ACTIVE",
        createdAt: Date.now(),
        raw: { mock: true },
      };
    }

    const payload = {
      order_id: input.orderId,
      order_amount: amountInRupees,
      order_currency: input.currency || "INR",
      customer_details: {
        customer_id: input.customerId || `cust_${Date.now()}`,
        customer_name: input.customerName || "Devotee",
        customer_email: input.customerEmail || "devotee@temple.org",
        customer_phone: input.customerPhone || "9999999999",
      },
      order_meta: {
        return_url: input.returnUrl || undefined,
        notify_url: input.notifyUrl || undefined,
      },
      order_note: input.orderNote || `Temple Service - ${input.orderId}`,
      order_tags: input.notes || undefined,
    };

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;

      if (!response.ok) {
        this.logger.error(
          `Cashfree createOrder error: ${data.message || response.statusText}`,
        );
        if (
          process.env.NODE_ENV !== "production" &&
          (this.appId.includes("TEST") ||
            this.appId.includes("test") ||
            data.message?.toLowerCase().includes("authentication"))
        ) {
          this.logger.warn(
            `Cashfree placeholder credentials in non-production. Using sandbox simulated session for order: ${input.orderId}`,
          );
          return {
            id: input.orderId,
            orderId: input.orderId,
            paymentSessionId: `session_${input.orderId}_mock_${Date.now()}`,
            amount: input.amount,
            currency: input.currency || "INR",
            receipt: input.receipt,
            status: "ACTIVE",
            createdAt: Date.now(),
            raw: { mock: true, response: data },
          };
        }

        throw new BadRequestException(
          data.message || `Cashfree order creation failed (${response.status})`,
        );
      }

      return {
        id: data.order_id || input.orderId,
        orderId: data.order_id || input.orderId,
        paymentSessionId: data.payment_session_id,
        amount: input.amount,
        currency: data.order_currency || input.currency || "INR",
        status: data.order_status || "ACTIVE",
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        raw: data,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      if (process.env.NODE_ENV !== "production") {
        this.logger.warn(
          `Cashfree API network error in dev: ${error.message}; fallback mock returned`,
        );
        return {
          id: input.orderId,
          orderId: input.orderId,
          paymentSessionId: `session_${input.orderId}_${Date.now()}`,
          amount: input.amount,
          currency: input.currency || "INR",
          receipt: input.receipt,
          status: "ACTIVE",
          createdAt: Date.now(),
          raw: { mock: true, error: error.message },
        };
      }
      throw new InternalServerErrorException(
        `Failed to communicate with Cashfree: ${error.message}`,
      );
    }
  }

  async fetchOrderStatus(orderId: string): Promise<{
    orderStatus: string;
    amount: number;
    payments?: PaymentDetails[];
    raw?: any;
  }> {
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException(
          "Cashfree credentials missing in production",
        );
      }
      return {
        orderStatus: "ACTIVE",
        amount: 0,
        payments: [],
        raw: { mock: true },
      };
    }

    try {
      const [orderRes, paymentsRes] = await Promise.all([
        fetch(`${this.baseUrl}/orders/${orderId}`, {
          method: "GET",
          headers: this.getHeaders(),
        }),
        fetch(`${this.baseUrl}/orders/${orderId}/payments`, {
          method: "GET",
          headers: this.getHeaders(),
        }),
      ]);

      if (!orderRes.ok) {
        if (
          process.env.NODE_ENV !== "production" &&
          (this.appId.includes("TEST") || this.appId.includes("test"))
        ) {
          return {
            orderStatus: "ACTIVE",
            amount: 0,
            payments: [],
            raw: { mock: true },
          };
        }
        throw new BadRequestException(`Order not found on Cashfree: ${orderId}`);
      }

      const orderData = (await orderRes.json()) as any;
      const paymentsData = paymentsRes.ok ? ((await paymentsRes.json()) as any[]) : [];

      const payments: PaymentDetails[] = Array.isArray(paymentsData)
        ? paymentsData.map((p) => ({
            id: String(p.cf_payment_id || p.payment_id || ""),
            orderId: String(p.order_id || orderId),
            amount: Math.round(Number(p.payment_amount || 0) * 100), // convert to paise
            currency: p.payment_currency || "INR",
            status: p.payment_status || "PENDING",
            paymentMethod: p.payment_group || p.payment_method?.type || undefined,
            paymentMessage: p.payment_message || undefined,
            paymentTime: p.payment_time || undefined,
            raw: p,
          }))
        : [];

      return {
        orderStatus: orderData.order_status || "PENDING",
        amount: Math.round(Number(orderData.order_amount || 0) * 100),
        payments,
        raw: orderData,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Failed to fetch Cashfree order status: ${error.message}`,
      );
    }
  }

  verifyWebhookSignature(
    signature: string,
    rawBody: string,
    timestamp?: string,
  ): boolean {
    if (!signature) return false;

    // Dev test signature bypass is strictly forbidden in production
    if (signature === "test_cashfree_signature") {
      if (process.env.NODE_ENV === "production") {
        this.logger.error("ATTEMPTED TEST SIGNATURE BYPASS BLOCKED IN PRODUCTION");
        return false;
      }
      return true;
    }

    const secret = this.webhookSecret || this.secretKey;
    if (!secret) return false;

    // Cashfree computes HMAC-SHA256 signature using timestamp + rawBody or rawBody directly
    const signaturePayload = timestamp ? `${timestamp}${rawBody}` : rawBody;

    // Base64 digest
    const expectedBase64 = createHmac("sha256", secret)
      .update(signaturePayload)
      .digest("base64");

    if (this.safeStringCompare(expectedBase64, signature)) {
      return true;
    }

    // Hex digest (some webhook configurations use hex)
    const expectedHex = createHmac("sha256", secret)
      .update(signaturePayload)
      .digest("hex");

    if (this.safeStringCompare(expectedHex, signature)) {
      return true;
    }

    // Also try without timestamp if timestamp was provided
    if (timestamp) {
      const fallbackBase64 = createHmac("sha256", secret)
        .update(rawBody)
        .digest("base64");
      if (this.safeStringCompare(fallbackBase64, signature)) return true;

      const fallbackHex = createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");
      if (this.safeStringCompare(fallbackHex, signature)) return true;
    }

    return false;
  }

  private safeStringCompare(a: string, b: string): boolean {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    try {
      return createHmac("sha256", "key").update(a).digest().equals(
        createHmac("sha256", "key").update(b).digest(),
      );
    } catch {
      return false;
    }
  }

  async refund(
    orderId: string,
    refundId: string,
    amountPaise: number,
    note?: string,
  ): Promise<RefundDetails> {
    const amountInRupees = Number((amountPaise / 100).toFixed(2));

    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === "production") {
        throw new InternalServerErrorException(
          "Cashfree credentials missing in production",
        );
      }
      return {
        id: refundId,
        orderId,
        amount: amountPaise,
        status: "SUCCESS",
        createdAt: Date.now(),
        raw: { mock: true },
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/refunds`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          refund_id: refundId,
          refund_amount: amountInRupees,
          refund_note: note || `Refund for order ${orderId}`,
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        throw new BadRequestException(
          data.message || `Cashfree refund failed (${response.status})`,
        );
      }

      return {
        id: data.refund_id || refundId,
        orderId: data.order_id || orderId,
        amount: amountPaise,
        status: data.refund_status || "SUCCESS",
        createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
        raw: data,
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        `Failed to process refund on Cashfree: ${error.message}`,
      );
    }
  }
}
