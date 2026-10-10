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
