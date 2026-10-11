import type { OrderStatus } from '@/types/order';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const STATUS_COLOR: Record<OrderStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#FFF4E0', fg: '#B26A00' },
  CONFIRMED: { bg: '#E3EFFF', fg: '#1F5FBF' },
  SHIPPING: { bg: '#EFE6FF', fg: '#6A3FC0' },
  DELIVERED: { bg: '#E3F7EC', fg: '#168A4F' },
  CANCELLED: { bg: '#FDE8E8', fg: '#C23030' },
};

export const STATUS_FILTERS: { value: OrderStatus | undefined; text: string }[] = [
  { value: undefined, text: 'Tất cả' },
  { value: 'PENDING', text: 'Chờ xác nhận' },
  { value: 'CONFIRMED', text: 'Đã xác nhận' },
  { value: 'SHIPPING', text: 'Đang giao' },
  { value: 'DELIVERED', text: 'Đã giao' },
  { value: 'CANCELLED', text: 'Đã hủy' },
];

/** Mã trùng bảng payment_methods trong CSDL. Hướng dẫn thanh toán online thuộc module Thanh toán. */
export const PAYMENT_METHODS = [
  { code: 'CASH', text: 'Tiền mặt khi nhận hàng', icon: 'cash-outline' },
  { code: 'BANK_TRANSFER', text: 'Chuyển khoản ngân hàng', icon: 'business-outline' },
  { code: 'BANK_QR', text: 'Quét mã QR ngân hàng', icon: 'qr-code-outline' },
  { code: 'MOMO', text: 'Ví MoMo', icon: 'wallet-outline' },
] as const;

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
  REFUNDED: 'Đã hoàn tiền',
};
