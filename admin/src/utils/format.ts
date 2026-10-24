const TZ = 'Asia/Ho_Chi_Minh'; // CSDL lưu UTC, hiển thị GMT+7

export const formatVnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(new Date(iso));

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const ADDRESS_LABEL: Record<string, string> = { HOME: 'Nhà', OFFICE: 'Công ty', OTHER: 'Khác' };

export const joinAddress = (a: { streetDetail: string; ward: string; district: string; province: string }) =>
  [a.streetDetail, a.ward, a.district, a.province].filter(Boolean).join(', ');

export const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

/** Rút gọn tiền cho biểu đồ: 1,2 tr / 3,4 tỷ. */
export function formatVndShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (abs >= 1e6) return `${(n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (abs >= 1e3) return `${(n / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} k`;
  return String(n);
}

/** Loại giao dịch sổ kho (inventory_transactions.transaction_type). */
export const TXN_LABEL: Record<string, string> = {
  IMPORT: 'Nhập kho',
  IMPORT_REVERSAL: 'Hủy phiếu nhập',
  SALE: 'Xuất bán',
  SALE_CANCEL: 'Hủy đơn – hoàn kho',
  RETURN_RESTOCK: 'Hàng trả nhập lại',
  ADJUST_IN: 'Điều chỉnh tăng',
  ADJUST_OUT: 'Điều chỉnh giảm',
};

const pad = (n: number) => String(n).padStart(2, '0');
/** Ngày theo giờ máy (VN) dạng YYYY-MM-DD. */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Khoảng ngày mặc định cho báo cáo: N ngày gần nhất tính cả hôm nay. */
export function lastDays(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - (n - 1));
  return { from: ymd(from), to: ymd(to) };
}

/** Từ đầu tháng đến hôm nay. */
export function thisMonth(): { from: string; to: string } {
  const t = new Date();
  return { from: ymd(new Date(t.getFullYear(), t.getMonth(), 1)), to: ymd(t) };
}

/** Ngưỡng mặc định "sắp hết hàng" (M6 #4). */
export const LOW_STOCK_THRESHOLD = 5;

