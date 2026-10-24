/** Khóa chống gửi trùng cho MỘT lần thanh toán POS. crypto.randomUUID chỉ có ở HTTPS/localhost nên có phương án dự phòng. */
export function newIdempotencyKey(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Chỉ giữ chữ số: ô nhập tiền. */
export const parseMoney = (v: string): number => Number(v.replace(/\D/g, '')) || 0;

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;

/** Gợi ý số tiền khách đưa: đúng số phải trả và các mệnh giá làm tròn gần nhất. */
export function cashSuggestions(payable: number): number[] {
  if (payable <= 0) return [];
  const set = new Set<number>([payable, roundUp(payable, 10_000), roundUp(payable, 50_000), roundUp(payable, 100_000), roundUp(payable, 500_000)]);
  return [...set].sort((a, b) => a - b).slice(0, 5);
}

export const PAYMENT_METHOD_HINT: Record<string, string> = {
  CASH: 'Thu tiền mặt, nhập tiền khách đưa để tính tiền thừa',
  BANK_TRANSFER: 'Khách chuyển khoản, nhân viên đã kiểm tra tiền về',
  BANK_QR: 'Khách quét mã QR ngân hàng, đã nhận tiền',
  MOMO: 'Khách thanh toán bằng ví MoMo, đã nhận tiền',
};
