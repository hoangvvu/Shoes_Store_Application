export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
export type Channel = 'ONLINE' | 'POS';

export interface OrderListItem {
  invoiceId: number;
  invoiceDate: string;
  channel: Channel;
  orderStatus: OrderStatus;
  customerId: number | null;
  customerName: string | null;
  employeeName: string | null;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  paymentStatus: string;
}

export interface OrderLine {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  salePrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface OrderHistory {
  historyId: number;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedAt: string;
  changedByName: string | null;
  note: string | null;
}

export interface OrderPayment {
  paymentId: number;
  methodCode: string;
  methodName: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  paidAt: string | null;
}

export interface OrderDetail extends OrderListItem {
  customerPhone: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  promotionName: string | null;
  voucherCode: string | null;
  note: string | null;
  paidAmount: number;
  refundedAmount: number;
  items: OrderLine[];
  history: OrderHistory[];
  payments: OrderPayment[];
  canCancel: boolean;
  canEdit: boolean;
  /** Chỉ có sau khi hủy: đơn đã thu tiền, cần tạo hoàn tiền ở module Thanh toán. */
  refundRequired?: boolean;
}

export interface OrderListParams {
  status?: OrderStatus;
  channel?: Channel;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  size: number;
}
