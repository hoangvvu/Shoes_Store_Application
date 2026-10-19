const VN_OFFSET_MS = 7 * 3600 * 1000; // "hôm nay" theo giờ GMT+7

/** Ngày hiện tại theo GMT+7 dưới dạng {y, m, d}. */
function todayVn() {
  const t = new Date(Date.now() + VN_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Số tuổi tròn của người sinh ngày `dob` (ngày sinh lấy theo UTC vì DATE được lưu/đọc theo UTC). */
export function ageOf(dob: Date): number {
  const t = todayVn();
  const y = dob.getUTCFullYear();
  const m = dob.getUTCMonth() + 1;
  const d = dob.getUTCDate();
  let age = t.y - y;
  if (t.m < m || (t.m === m && t.d < d)) age -= 1;
  return age;
}

export function isFutureDate(dob: Date): boolean {
  const t = todayVn();
  const y = dob.getUTCFullYear();
  const m = dob.getUTCMonth() + 1;
  const d = dob.getUTCDate();
  return y > t.y || (y === t.y && (m > t.m || (m === t.m && d > t.d)));
}

/** Ngày (UTC 00:00) cách hôm nay (GMT+7) đúng `years` năm; 29/02 lùi về 28/02 khi năm đích không nhuận. */
export function yearsAgo(years: number): Date {
  const t = todayVn();
  const y = t.y - years;
  const d = t.m === 2 && t.d === 29 && new Date(Date.UTC(y, 1, 29)).getUTCMonth() !== 1 ? 28 : t.d;
  return new Date(Date.UTC(y, t.m - 1, d));
}
