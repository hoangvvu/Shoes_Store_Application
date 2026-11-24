import type { AuthUser } from '../types/auth';

export const SESSION_MAX_AGE_MS = 15 * 60 * 1000; // 15 phút

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  sessionStartTime: number;
}

const KEY = 'ouran_admin_session';

// "Ghi nhớ đăng nhập" bật -> localStorage; tắt -> sessionStorage.
export function loadSession(): { session: StoredSession; remember: boolean } | null {
  for (const [store, remember] of [[localStorage, true], [sessionStorage, false]] as const) {
    try {
      const raw = store.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as StoredSession;
        // Kiểm tra xem phiên làm việc đã quá 15 phút chưa
        if (s.sessionStartTime && Date.now() - s.sessionStartTime > SESSION_MAX_AGE_MS) {
          clearSession();
          return null;
        }
        return { session: s, remember };
      }
    } catch {
      store.removeItem(KEY);
    }
  }
  return null;
}

export function saveSession(session: Omit<StoredSession, 'sessionStartTime'> & { sessionStartTime?: number }, remember: boolean): void {
  clearSession();
  const data: StoredSession = {
    ...session,
    sessionStartTime: session.sessionStartTime || Date.now(),
  };
  (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(data));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
