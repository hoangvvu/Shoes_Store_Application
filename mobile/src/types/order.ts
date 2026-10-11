export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

export interface OrderListItem {
  invoiceId: number;
  invoiceDate: string;
  channel: 'ONLINE' | 'POS';
  orderStatus: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  paymentStatus: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface PreviewItem {
  variantId: number;
  productName: string;
  imageUrl: string | null;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface OrderPreview {
  items: PreviewItem[];
  totalAmount: number;
  invoiceDiscountPercent: number;
  invoiceDiscountSource: 'VOUCHER' | 'TIER' | null;
  discountAmount: number;
  amountPayable: number;
  voucher: { code: string; status: 'OK' | 'NOT_FOUND' | 'EXHAUSTED' | 'NOT_APPLIED' | 'NONE'; message: string } | null;
  issues: { variantId: number; productName: string; availability: string; message: string }[];
  canPlaceOrder: boolean;
}

export interface OrderLine {
  variantId: number;
  productName: string;
  imageUrl: string | null;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  salePrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface OrderDetail extends OrderListItem {
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  voucherCode: string | null;
  note: string | null;
  paidAmount: number;
  items: OrderLine[];
  history: { historyId: number; oldStatus: OrderStatus | null; newStatus: OrderStatus; changedAt: string; changedByName: string | null; note: string | null }[];
  payments: { paymentId: number; methodName: string; amount: number; status: 'PENDING' | 'SUCCESS' | 'FAILED' }[];
  canCancel: boolean;
}

export interface ReorderResult {
  added: { variantId: number; productName: string; quantity: number; requested: number }[];
  skipped: { variantId: number; productName: string; reason: string }[];
}

export interface CreateOrderPayload {
  addressId: number;
  methodCode: string;
  voucherCode?: string;
  note?: string;
}
