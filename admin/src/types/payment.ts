export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type RefundStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface PaymentMethod {
  methodId: number;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
  isActive: boolean;
}

export interface Payment {
  paymentId: number;
  invoiceId: number;
  methodId: number;
  methodCode: string;
  methodName: string;
  amount: number;
  status: PaymentStatus;
  paidAt: string | null;
  proofUrl: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface Refund {
  refundId: number;
  invoiceId: number;
  amount: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  completedAt: string | null;
  completedBy: number | null;
}
