// ─── Payment Methods ──────────────────────────────────────────────────────────

export interface PaymentMethod {
  methodId: number;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
  isActive: boolean;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Payment {
  paymentId: number;
  invoiceId: number;
  methodCode: string;
  methodName: string;
  amount: number;
  status: PaymentStatus;
  transactionCode: string | null;
  proofUrl: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentStatusResult {
  invoiceId: number;
  payments: Payment[];
  refunds: Refund[];
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

export type RefundStatus = 'PENDING' | 'SUCCESS' | 'REJECTED';

export interface Refund {
  refundId: number;
  paymentId: number;
  amount: number;
  reason: string;
  status: RefundStatus;
  transactionCode: string | null;
  processedAt: string | null;
  processedBy: number | null;
  createdAt: string;
}

// ─── Retry Pay ────────────────────────────────────────────────────────────────

export interface RetryPayResult {
  paymentId: number;
  invoiceId: number;
  amount: number;
  method: string;
  status: 'PENDING';
}
