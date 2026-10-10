import crypto from 'node:crypto';
import { env } from '../config/env';
import { OTP_LENGTH } from '../constants/auth.constant';

export function generateOtp(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');
}

/**
 * Điểm cắm gửi OTP. Đồ án chưa tích hợp nhà cung cấp SMS nên ở môi trường dev chỉ in ra console.
 * Khi có SMS/email provider, thay phần thân hàm này; không đổi chữ ký.
 */
export async function deliverOtp(phone: string, otp: string): Promise<void> {
  if (!env.isProd) console.log(`[OTP] Gửi tới ${phone}: ${otp}`);
}
