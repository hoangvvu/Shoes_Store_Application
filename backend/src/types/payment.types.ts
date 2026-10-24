export interface PaymentMethodRow {
  methodId: number;
  methodCode: string;
  methodName: string;
  isOnline: boolean;
  isActive: boolean;
}

export interface PaymentRow {
  paymentId: number;
  invoiceId: number;
  methodCode: string;
  methodName: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  transactionCode: string | null;
  proofUrl: string | null;
  note: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface RefundRow {
  refundId: number;
  paymentId: number;
  amount: number;
  reason: string;
  status: 'PENDING' | 'SUCCESS' | 'REJECTED';
  transactionCode: string | null;
  processedAt: Date | null;
  processedBy: number | null;
  createdAt: Date;
}
