import type { Channel, OrderStatus } from '../constants/order.constant';

export interface OrderListRow {
  invoiceId: number;
  invoiceDate: Date;
  channel: Channel;
  orderStatus: OrderStatus;
  customerId: number | null;
  customerName: string | null;
  employeeName: string | null;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  paymentStatus: string;
  paidAmount: number;
  refundedAmount: number;
}

export interface InvoiceSummary {
  /** Số hóa đơn khớp bộ lọc. */
  count: number;
  /** Tổng tiền đã thu. */
  paidTotal: number;
  /** Tổng tiền đã hoàn. */
  refundedTotal: number;
  /** Doanh thu thực = đã thu - đã hoàn. */
  netTotal: number;
}

export interface OrderRow extends OrderListRow {
  customerPhone: string | null;
  /** Địa chỉ mặc định đã lưu của khách (dùng hiển thị đơn POS của khách có tài khoản). */
  customerAddress: string | null;
  employeeId: number | null;
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  promotionId: number | null;
  promotionName: string | null;
  voucherCode: string | null;
  stockDeducted: boolean;
  note: string | null;
}

export interface OrderLineRow {
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

export interface HistoryRow {
  historyId: number;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedAt: Date;
  changedByName: string | null;
  note: string | null;
}

export interface SaleVariantRow {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  unitPrice: number;
  stockQuantity: number;
  sellable: boolean;
}

export interface ListFilter {
  status?: string;
  channel?: string;
  from?: Date;
  to?: Date;
  customerId?: number;
  employeeId?: number;
  q?: string;
  /** Chỉ lấy hóa đơn: 'ANY' = đã hoàn thành+đã thanh toán hoặc đã hoàn tiền; hoặc một loại cụ thể. */
  invoice?: 'ANY' | 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  page: number;
  size: number;
}
