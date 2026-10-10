import axios from 'axios';
import type { ApiErrorBody } from '../types/auth';

/** Lấy thông điệp tiếng Việt từ body lỗi { code, message, details } của backend. */
export function getErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.';
    return err.response.data?.message ?? fallback;
  }
  return fallback;
}
