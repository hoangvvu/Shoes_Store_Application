// Phản chiếu quy tắc của backend (backend/src/validators/common.ts). Backend vẫn là nơi kiểm tra cuối cùng.
export const EMPLOYEE_MIN_AGE = 18;

/** SĐT nhân viên: 10–11 chữ số, bắt đầu bằng số 0 (M3 #7). Trả '' nếu hợp lệ. */
export const validatePhone = (v: string) =>
  /^0\d{9,10}$/.test(v.trim()) ? '' : 'Số điện thoại phải gồm 10–11 chữ số và bắt đầu bằng số 0';

const pad = (n: number) => String(n).padStart(2, '0');
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Ngày sinh muộn nhất được phép (hôm nay trừ 18 năm) để đặt `max` cho ô chọn ngày. */
export function latestBirthDate(): string {
  const t = new Date();
  return toYmd(new Date(t.getFullYear() - EMPLOYEE_MIN_AGE, t.getMonth(), t.getDate()));
}

/** Ngày sinh: hợp lệ, không ở tương lai, đủ 18 tuổi. Trả '' nếu hợp lệ. */
export function validateBirthDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return 'Ngày sinh không hợp lệ';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return 'Ngày sinh không hợp lệ';
  const today = toYmd(new Date());
  if (ymd > today) return 'Ngày sinh không được ở tương lai';
  if (ymd > latestBirthDate()) return `Nhân viên phải đủ ${EMPLOYEE_MIN_AGE} tuổi trở lên`;
  if (y < new Date().getFullYear() - 100) return 'Ngày sinh không hợp lệ';
  return '';
}

export const PASSWORD_RULES = [
  { key: 'len', text: 'Tối thiểu 8 ký tự', test: (v: string) => v.length >= 8 },
  { key: 'upper', text: 'Có chữ hoa (A–Z)', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower', text: 'Có chữ thường (a–z)', test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', text: 'Có chữ số (0–9)', test: (v: string) => /\d/.test(v) },
] as const;

/** Mật khẩu mới: ≥ 8 ký tự, có chữ hoa, chữ thường và số; tối đa 72 (giới hạn bcrypt). */
export function validatePassword(v: string): string {
  const failed = PASSWORD_RULES.find((r) => !r.test(v));
  if (failed) return `Mật khẩu mới: ${failed.text.charAt(0).toLowerCase()}${failed.text.slice(1)}`;
  if (v.length > 72) return 'Mật khẩu tối đa 72 ký tự';
  return '';
}

export const formatYmdVn = (iso: string | null): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

/** M4 #15: mã màu bắt đầu bằng # và 6 ký tự hex (#000000). Trả '' nếu hợp lệ. */
export const validateHex = (v: string) => (/^#[0-9A-Fa-f]{6}$/.test(v.trim()) ? '' : 'Mã màu phải có dạng #RRGGBB, ví dụ #000000');

/** URL ảnh phải là http(s) hoặc đường dẫn nội bộ /uploads/. Bỏ trống được coi là hợp lệ. */
export function validateImageUrl(v: string): string {
  if (!v.trim()) return '';
  if (v.trim().startsWith('/uploads/')) return '';
  try {
    const u = new URL(v.trim());
    return u.protocol === 'http:' || u.protocol === 'https:' ? '' : 'URL ảnh phải bắt đầu bằng http:// hoặc https://';
  } catch {
    return 'URL ảnh không hợp lệ';
  }
}

/** M5 #7: email nhà cung cấp có @ và tên miền hợp lệ. Bỏ trống được coi là hợp lệ. */
export const validateEmail = (v: string) =>
  !v.trim() || /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v.trim()) ? '' : 'Email không đúng định dạng';

/** M5 #7: SĐT nhà cung cấp 10–11 chữ số. Bỏ trống được coi là hợp lệ. */
export const validateSupplierPhone = (v: string) =>
  !v.trim() || /^\d{10,11}$/.test(v.trim()) ? '' : 'Số điện thoại nhà cung cấp phải gồm 10–11 chữ số';

