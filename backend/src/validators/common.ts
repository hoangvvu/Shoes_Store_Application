import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants/auth.constant';

export const usernameField = z
  .string({ required_error: 'Vui lòng nhập tên đăng nhập' })
  .trim()
  .min(4, 'Tên đăng nhập tối thiểu 4 ký tự')
  .max(50, 'Tên đăng nhập tối đa 50 ký tự')
  .regex(/^[A-Za-z0-9._-]+$/, 'Tên đăng nhập chỉ gồm chữ, số và các ký tự . _ -');

export const passwordField = z
  .string({ required_error: 'Vui lòng nhập mật khẩu' })
  .min(PASSWORD_MIN_LENGTH, `Mật khẩu tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`)
  .max(PASSWORD_MAX_LENGTH, `Mật khẩu tối đa ${PASSWORD_MAX_LENGTH} ký tự`);

export const phoneField = z
  .string({ required_error: 'Vui lòng nhập số điện thoại' })
  .trim()
  .regex(/^(0|\+84)\d{9}$/, 'Số điện thoại không hợp lệ');

export const fullNameField = z
  .string({ required_error: 'Vui lòng nhập họ tên' })
  .trim()
  .min(2, 'Họ tên tối thiểu 2 ký tự')
  .max(100, 'Họ tên tối đa 100 ký tự');

export const idParam = z.object({
  id: z.coerce.number().int().positive('Mã không hợp lệ'),
});
