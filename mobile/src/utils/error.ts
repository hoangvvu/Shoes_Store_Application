import axios from 'axios';
import type { ApiErrorBody } from '@/types/auth';

export function getErrorMessage(err: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại'): string {
  if (axios.isAxiosError<ApiErrorBody>(err)) {
    if (!err.response) return 'Không kết nối được máy chủ. Hãy kiểm tra mạng và địa chỉ API.';
    return err.response.data?.message ?? fallback;
  }
  return fallback;
}
