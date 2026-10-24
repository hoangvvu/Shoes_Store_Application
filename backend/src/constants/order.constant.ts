export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CHANNELS = ['ONLINE', 'POS'] as const;
export type Channel = (typeof CHANNELS)[number];

/** Trạng thái còn có thể hủy (đã DELIVERED/CANCELLED thì không). */
export const CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPING'];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

/**
 * Loại hóa đơn (màn "Quản lý hóa đơn"). Hóa đơn = đơn đã giao VÀ đã thanh toán đủ, hoặc đơn đã có hoàn tiền
 * (kể cả đơn đã hủy sau khi thu tiền). Trạng thái hoàn thành (order_status) và trạng thái hoàn tiền
 * (payment_status suy ra từ payments/refunds) là HAI khái niệm tách biệt.
 */
export const INVOICE_TYPES = ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

/** Đơn có được xem là hóa đơn không (dùng khi xem chi tiết để không lộ đơn chưa hoàn tất). */
export function isInvoice(orderStatus: OrderStatus, paymentStatus: string): boolean {
  if (paymentStatus === 'PARTIALLY_REFUNDED' || paymentStatus === 'REFUNDED') return true;
  return orderStatus === 'DELIVERED' && paymentStatus === 'PAID';
}
