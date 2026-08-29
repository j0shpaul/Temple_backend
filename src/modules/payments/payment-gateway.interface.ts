export interface PaymentOrder {
  id: string;
  orderId: string;
  paymentSessionId?: string;
  amount: number;
  currency: string;
  receipt?: string;
  status: string;
  createdAt?: number;
  raw?: any;
}

export interface PaymentDetails {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string; // SUCCESS, FAILED, PENDING, USER_DROPPED, CANCELLED
  paymentMethod?: string;
  paymentMessage?: string;
  paymentTime?: string;
  raw?: any;
}

export interface RefundDetails {
  id: string;
  orderId?: string;
  paymentId?: string;
  amount: number;
  status: string;
  createdAt?: number;
  raw?: any;
}

export interface CreateOrderInput {
  orderId: string;
  amount: number; // amount in paise
  currency: string;
  receipt?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  returnUrl?: string;
  notifyUrl?: string;
  orderNote?: string;
  notes?: Record<string, string>;
}

export abstract class PaymentGateway {
  abstract name: string;
  abstract createOrder(input: CreateOrderInput): Promise<PaymentOrder>;
  abstract fetchOrderStatus(orderId: string): Promise<{
    orderStatus: string;
    amount: number;
    payments?: PaymentDetails[];
    raw?: any;
  }>;
  abstract verifyWebhookSignature(
    signature: string,
    rawBody: string,
    timestamp?: string,
  ): boolean;
  abstract refund(
    orderId: string,
    refundId: string,
    amount: number,
    note?: string,
  ): Promise<RefundDetails>;
}
