import type { AuthUser } from '../types/auth';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const KEY = 'ouran_admin_session';

// "Ghi nhớ đăng nhập" bật -> localStorage (giữ khi đóng trình duyệt); tắt -> sessionStorage.
export function loadSession(): { session: StoredSession; remember: boolean } | null {
  for (const [store, remember] of [[localStorage, true], [sessionStorage, false]] as const) {
    try {
      const raw = store.getItem(KEY);
      if (raw) return { session: JSON.parse(raw) as StoredSession, remember };
    } catch {
      store.removeItem(KEY);
    }
  }
  return null;
}

export function saveSession(session: StoredSession, remember: boolean): void {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
