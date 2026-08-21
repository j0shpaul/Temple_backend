export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  email?: string;
  contact?: string;
  created_at: number;
}

export interface RazorpayRefund {
  id: string;
  entity: string;
  amount: number;
  payment_id: string;
  status: string;
  created_at: number;
}

export interface CreateOrderInput {
  amount: number; // paise
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export abstract class PaymentGateway {
  abstract createOrder(input: CreateOrderInput): Promise<RazorpayOrder>;
  abstract verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean>;
  abstract fetchPayment(paymentId: string): Promise<RazorpayPayment>;
  abstract refund(paymentId: string, amount?: number): Promise<RazorpayRefund>;
  abstract name: string;
}
