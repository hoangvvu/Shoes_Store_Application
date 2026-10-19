// Trường cá nhân không bắt buộc dùng chung cho khách hàng và nhân viên.
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export const GENDER_LABEL: Record<Gender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
export const genderText = (g: Gender | null | undefined) => (g ? GENDER_LABEL[g] : '—');

export const GENDER_OPTIONS: { value: '' | Gender; label: string }[] = [
  { value: '', label: 'Chưa cung cấp' },
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
];

/** Email không bắt buộc: rỗng là hợp lệ. Trả '' nếu hợp lệ. */
export const validateEmail = (v: string): string => {
  const e = v.trim();
  if (!e) return '';
  if (e.length > 100) return 'Email tối đa 100 ký tự';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? '' : 'Email không hợp lệ';
};

/** Ngày sinh khách hàng: không bắt buộc, không ở tương lai, không quá 120 tuổi. */
export const validateCustomerBirthDate = (ymd: string): string => {
  if (!ymd) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return 'Ngày sinh không hợp lệ';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return 'Ngày sinh không hợp lệ';
  const now = new Date();
  if (dt > now) return 'Ngày sinh không được ở tương lai';
  if (y < now.getFullYear() - 120) return 'Ngày sinh không hợp lệ';
  return '';
};

export const todayYmd = (): string => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
