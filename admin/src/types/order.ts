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
  /** Tổng tiền đã thu (giao dịch SUCCESS). */
  paidAmount: number;
  /** Tổng tiền đã hoàn (refunds SUCCESS). */
  refundedAmount: number;
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
  transactionCode?: string | null;
  proofUrl?: string | null;
}

export interface OrderRefund {
  refundId: number;
  paymentId: number;
  methodName: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  reason: string;
  transactionCode: string | null;
  requestedAt: string;
  completedAt: string | null;
  processedByName: string | null;
}

export interface OrderDetail extends OrderListItem {
  customerPhone: string | null;
  customerAddress: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  promotionName: string | null;
  voucherCode: string | null;
  note: string | null;
  refunds: OrderRefund[];
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

/* ===================== Hóa đơn (M8) ===================== */

/** Loại hóa đơn: hoàn thành (đã giao + đã thanh toán), hoàn tiền một phần, đã hoàn tiền. */
export type InvoiceType = 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';

export interface InvoiceSummary {
  count: number;
  paidTotal: number;
  refundedTotal: number;
  netTotal: number;
}

export interface InvoiceListParams {
  type?: InvoiceType;
  channel?: Channel;
  from?: string;
  to?: string;
  q?: string;
  page: number;
  size: number;
}

/* ===================== Bán tại quầy (POS) ===================== */

export interface PosVariant {
  variantId: number;
  sku: string;
  sizeLabel: string;
  colorName: string;
  hexCode: string | null;
  stockQuantity: number;
}

export interface PosProduct {
  productId: number;
  productName: string;
  imageUrl: string | null;
  categoryName: string | null;
  brandName: string | null;
  /** Giá gốc. */
  unitPrice: number;
  /** % khuyến mãi sản phẩm đang hiệu lực (0 nếu không có). */
  discountPercent: number;
  /** Giá sau khuyến mãi sản phẩm. */
  salePrice: number;
  variants: PosVariant[];
}

export interface PaymentMethodOption {
  methodCode: string;
  methodName: string;
  isOnline: boolean;
}

export interface PosPreviewLine {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineDiscount: number;
  lineTotal: number;
  stockQuantity: number;
}

export interface PosPreview {
  items: PosPreviewLine[];
  totalAmount: number;
  invoiceDiscountPercent: number;
  invoiceDiscountSource: 'VOUCHER' | 'TIER' | null;
  discountAmount: number;
  amountPayable: number;
  voucher: { code: string; status: string; message: string } | null;
  issues: { variantId: number; productName: string | null; availability: string; message: string }[];
  canCheckout: boolean;
}

export interface PosOrderPayload {
  items: { variantId: number; quantity: number }[];
  customerId?: number;
  methodCode: string;
  voucherCode?: string;
  note?: string;
  amountReceived?: number;
  transactionCode?: string;
}

/** Kết quả bán tại quầy: chi tiết hóa đơn vừa tạo + tiền thừa (chỉ khi thu tiền mặt có nhập tiền khách đưa). */
export type PosOrderResult = OrderDetail & { change: number | null };
