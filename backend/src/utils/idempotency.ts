import { createHash } from 'crypto';
import { AppError } from '../errors/AppError';

interface Entry {
  fingerprint: string;
  promise: Promise<unknown>;
  expiresAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, Entry>();

const fingerprintOf = (payload: unknown) => createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');

function sweep(now: number) {
  for (const [k, v] of store) if (v.expiresAt <= now) store.delete(k);
}

/**
 * Chống tạo trùng khi bấm nhiều lần / mạng chập chờn tự gửi lại: cùng `key` (Idempotency-Key) + cùng nội dung
 * thì chỉ thực thi MỘT lần; lần gửi lại (đang chạy hoặc đã xong) nhận đúng kết quả cũ.
 * Lỗi thì không lưu, để người dùng sửa giỏ rồi thử lại với cùng key.
 * Lưu trong bộ nhớ tiến trình (đủ cho 1 instance backend; nhiều instance cần chuyển sang Redis/CSDL).
 */
export async function runOnce<T>(scope: string, key: string | undefined, payload: unknown, fn: () => Promise<T>): Promise<T> {
  if (!key) return fn();
  const now = Date.now();
  sweep(now);

  const id = `${scope}:${key}`;
  const fingerprint = fingerprintOf(payload);
  const existing = store.get(id);
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw AppError.conflict('Giao dịch này đã được gửi trước đó với nội dung khác. Hãy kiểm tra danh sách hóa đơn trước khi bán lại để tránh trùng.', 'IDEMPOTENCY_KEY_REUSED');
    }
    return existing.promise as Promise<T>;
  }

  const promise = fn();
  store.set(id, { fingerprint, promise, expiresAt: now + TTL_MS });
  try {
    return await promise;
  } catch (err) {
    store.delete(id);
    throw err;
  }
}
