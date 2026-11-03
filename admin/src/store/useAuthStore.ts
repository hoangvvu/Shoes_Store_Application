import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import { clearSession, loadSession, saveSession, SESSION_MAX_AGE_MS } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionStartTime: number | null;
  remember: boolean;
  setSession: (s: { accessToken: string; refreshToken: string; user: AuthUser; sessionStartTime?: number }, remember: boolean) => void;
  setAccessToken: (token: string) => void;
  setFullName: (fullName: string) => void;
  isExpired: () => boolean;
  clear: () => void;
}

const initial = loadSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial?.session.user ?? null,
  accessToken: initial?.session.accessToken ?? null,
  refreshToken: initial?.session.refreshToken ?? null,
  sessionStartTime: initial?.session.sessionStartTime ?? null,
  remember: initial?.remember ?? false,

  setSession: (s, remember) => {
    const sessionStartTime = s.sessionStartTime || Date.now();
    saveSession({ ...s, sessionStartTime }, remember);
    set({ ...s, sessionStartTime, remember });
  },

  setAccessToken: (accessToken) => {
    const { user, refreshToken, remember, sessionStartTime } = get();
    if (user && refreshToken) {
      saveSession({ accessToken, refreshToken, user, sessionStartTime: sessionStartTime || Date.now() }, remember);
    }
    set({ accessToken });
  },

  setFullName: (fullName) => {
    const { user, accessToken, refreshToken, remember, sessionStartTime } = get();
    if (!user || !accessToken || !refreshToken) return;
    const next = { ...user, fullName };
    saveSession({ accessToken, refreshToken, user: next, sessionStartTime: sessionStartTime || Date.now() }, remember);
    set({ user: next });
  },

  isExpired: () => {
    const { sessionStartTime } = get();
    if (!sessionStartTime) return false;
    return Date.now() - sessionStartTime >= SESSION_MAX_AGE_MS;
  },

  clear: () => {
    clearSession();
    set({ user: null, accessToken: null, refreshToken: null, sessionStartTime: null });
  },
}));
