export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_TX_LABEL: Record<string, string> = { PENDING: 'Chờ thu', SUCCESS: 'Thành công', FAILED: 'Thất bại' };

export const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

/** Lấy HTML bản in từ backend (cần token nên không mở thẳng URL), mở cửa sổ mới rồi gọi hộp thoại in. */
export function openPrintWindow(html: string): void {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Trình duyệt đang chặn cửa sổ mới. Hãy cho phép pop-up cho trang này.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
