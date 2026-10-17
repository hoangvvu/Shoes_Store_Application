import { PASSWORD_MIN_LENGTH } from '@/constants/app';

// Phản chiếu quy tắc của backend (validators/common.ts). Backend vẫn là nơi kiểm tra cuối cùng.
export const validators = {
  lastName: (v: string) => (!v.trim() ? 'Vui lòng nhập họ' : v.trim().length > 50 ? 'Họ tối đa 50 ký tự' : ''),
  firstName: (v: string) => (!v.trim() ? 'Vui lòng nhập tên' : v.trim().length > 50 ? 'Tên tối đa 50 ký tự' : ''),
  phone: (v: string) => (/^(0|\+84)\d{9}$/.test(v.trim()) ? '' : 'Số điện thoại không hợp lệ'),
  // M1 #12: 4–50 ký tự; chữ cái, số, "_" hoặc "-"; không khoảng trắng (không trim để bắt khoảng trắng đầu/cuối)
  username: (v: string) =>
    v.length < 4
      ? 'Tên đăng nhập tối thiểu 4 ký tự'
      : v.length > 50
        ? 'Tên đăng nhập tối đa 50 ký tự'
        : /^[A-Za-z0-9_-]+$/.test(v)
          ? ''
          : 'Tên đăng nhập chỉ gồm chữ cái, số, dấu gạch dưới (_) hoặc gạch ngang (-), không có khoảng trắng',
  // M1 #12: tối thiểu 8 ký tự, có chữ hoa, chữ thường và số (tối đa 72 vì giới hạn bcrypt)
  password: (v: string) =>
    v.length < PASSWORD_MIN_LENGTH
      ? `Mật khẩu tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`
      : v.length > 72
        ? 'Mật khẩu tối đa 72 ký tự'
        : !/[A-Z]/.test(v)
          ? 'Mật khẩu phải có ít nhất 1 chữ hoa'
          : !/[a-z]/.test(v)
            ? 'Mật khẩu phải có ít nhất 1 chữ thường'
            : !/\d/.test(v)
              ? 'Mật khẩu phải có ít nhất 1 chữ số'
              : '',
  confirm: (v: string, original: string) => (v === original ? '' : 'Mật khẩu nhập lại không khớp'),
};

/** Chuyển giữa YYYY-MM-DD (API) và dd/mm/yyyy (nhập trên điện thoại, không cần thêm thư viện chọn ngày). */
export const ymdToDmy = (ymd: string | null): string => (ymd ? ymd.slice(0, 10).split('-').reverse().join('/') : '');
export const dmyToYmd = (dmy: string): string | null => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dmy.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

export const optionalValidators = {
  /** Email không bắt buộc: rỗng là hợp lệ. */
  email: (v: string) => {
    const e = v.trim();
    if (!e) return '';
    if (e.length > 100) return 'Email tối đa 100 ký tự';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? '' : 'Email không hợp lệ';
  },
  /** Ngày sinh không bắt buộc, nhập dd/mm/yyyy; không ở tương lai, không quá 120 tuổi. */
  birthDate: (dmy: string) => {
    if (!dmy.trim()) return '';
    const ymd = dmyToYmd(dmy);
    if (!ymd) return 'Ngày sinh nhập theo dạng dd/mm/yyyy';
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return 'Ngày sinh không hợp lệ';
    const now = new Date();
    if (dt > now) return 'Ngày sinh không được ở tương lai';
    if (y < now.getFullYear() - 120) return 'Ngày sinh không hợp lệ';
    return '';
  },
};

export const firstError = (...errors: string[]) => errors.find(Boolean) ?? '';
