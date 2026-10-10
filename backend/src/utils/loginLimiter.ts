import { LOGIN_MAX_FAILS, LOGIN_WINDOW_MS } from '../constants/auth.constant';

interface Entry {
  count: number;
  firstAt: number;
}

/** Giới hạn số lần sai theo khóa (IP + username). Lưu bộ nhớ; đổi sang Redis nếu chạy nhiều instance. */
export class FailLimiter {
  private readonly map = new Map<string, Entry>();
  constructor(
    private readonly max = LOGIN_MAX_FAILS,
    private readonly windowMs = LOGIN_WINDOW_MS,
  ) {}

  private get(key: string): Entry | undefined {
    const e = this.map.get(key);
    if (e && Date.now() - e.firstAt > this.windowMs) {
      this.map.delete(key);
      return undefined;
    }
    return e;
  }

  isBlocked(key: string): boolean {
    return (this.get(key)?.count ?? 0) >= this.max;
  }

  fail(key: string): void {
    const e = this.get(key);
    if (e) e.count += 1;
    else this.map.set(key, { count: 1, firstAt: Date.now() });
  }

  reset(key: string): void {
    this.map.delete(key);
  }
}

export const loginLimiter = new FailLimiter();
export const otpLimiter = new FailLimiter();
