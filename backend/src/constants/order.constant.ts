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
