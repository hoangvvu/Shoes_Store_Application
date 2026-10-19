import { z } from 'zod';
import { OTP_LENGTH, PORTALS } from '../constants/auth.constant';
import { firstNameField, lastNameField, passwordField, phoneField, usernameField } from './common';

export const registerSchema = z.object({
  lastName: lastNameField,
  firstName: firstNameField,
  phone: phoneField,
  username: usernameField,
  password: passwordField,
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập').max(50),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu').max(200),
  portal: z.enum(PORTALS).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Thiếu refresh token'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu cũ'),
  newPassword: passwordField,
});

export const forgotSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập').max(50),
});

export const resetSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập').max(50),
  otp: z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Mã OTP gồm ${OTP_LENGTH} chữ số`),
  newPassword: passwordField,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
