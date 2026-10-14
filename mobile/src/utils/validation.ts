import { PASSWORD_MIN_LENGTH } from '@/constants/app';

// Phản chiếu quy tắc của backend (validators/common.ts). Backend vẫn là nơi kiểm tra cuối cùng.
export const validators = {
  fullName: (v: string) => (v.trim().length >= 2 ? '' : 'Họ tên tối thiểu 2 ký tự'),
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

export const firstError = (...errors: string[]) => errors.find(Boolean) ?? '';
