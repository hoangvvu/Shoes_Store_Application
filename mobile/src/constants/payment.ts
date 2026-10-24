import type { PaymentStatus, RefundStatus } from '@/types/payment';

export const PAYMENT_TX_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Đang chờ',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
};

export const PAYMENT_TX_COLOR: Record<PaymentStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#FFF4E0', fg: '#B26A00' },
  SUCCESS: { bg: '#E3F7EC', fg: '#168A4F' },
  FAILED: { bg: '#FDE8E8', fg: '#C23030' },
};

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  PENDING: 'Đang xử lý',
  SUCCESS: 'Đã hoàn',
  REJECTED: 'Bị từ chối',
};

export const REFUND_STATUS_COLOR: Record<RefundStatus, { bg: string; fg: string }> = {
  PENDING: { bg: '#FFF4E0', fg: '#B26A00' },
  SUCCESS: { bg: '#E3F7EC', fg: '#168A4F' },
  REJECTED: { bg: '#FDE8E8', fg: '#C23030' },
};

/** Tên hình thức thanh toán khi không có từ API */
export const METHOD_DISPLAY: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  BANK_QR: 'QR ngân hàng',
  MOMO: 'Ví MoMo',
};
