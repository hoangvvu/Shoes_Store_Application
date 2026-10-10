import { PASSWORD_MIN_LENGTH } from '@/constants/app';

// Phản chiếu quy tắc của backend (validators/common.ts). Backend vẫn là nơi kiểm tra cuối cùng.
export const validators = {
  fullName: (v: string) => (v.trim().length >= 2 ? '' : 'Họ tên tối thiểu 2 ký tự'),
  phone: (v: string) => (/^(0|\+84)\d{9}$/.test(v.trim()) ? '' : 'Số điện thoại không hợp lệ'),
  username: (v: string) =>
    v.trim().length < 4
      ? 'Tên đăng nhập tối thiểu 4 ký tự'
      : /^[A-Za-z0-9._-]+$/.test(v.trim())
        ? ''
        : 'Tên đăng nhập chỉ gồm chữ, số và . _ -',
  password: (v: string) => (v.length >= PASSWORD_MIN_LENGTH ? '' : `Mật khẩu tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`),
  confirm: (v: string, original: string) => (v === original ? '' : 'Mật khẩu nhập lại không khớp'),
};

export const firstError = (...errors: string[]) => errors.find(Boolean) ?? '';
