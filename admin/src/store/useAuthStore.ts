import { create } from 'zustand';
import type { AuthUser } from '../types/auth';
import { clearSession, loadSession, saveSession } from '../utils/storage';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  remember: boolean;
  setSession: (s: { accessToken: string; refreshToken: string; user: AuthUser }, remember: boolean) => void;
  setAccessToken: (token: string) => void;
  setFullName: (fullName: string) => void;
  clear: () => void;
}

const initial = loadSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initial?.session.user ?? null,
  accessToken: initial?.session.accessToken ?? null,
  refreshToken: initial?.session.refreshToken ?? null,
  remember: initial?.remember ?? false,

  setSession: (s, remember) => {
    saveSession(s, remember);
    set({ ...s, remember });
  },

  setAccessToken: (accessToken) => {
    const { user, refreshToken, remember } = get();
    if (user && refreshToken) saveSession({ accessToken, refreshToken, user }, remember);
    set({ accessToken });
  },

  setFullName: (fullName) => {
    const { user, accessToken, refreshToken, remember } = get();
    if (!user || !accessToken || !refreshToken) return;
    const next = { ...user, fullName };
    saveSession({ accessToken, refreshToken, user: next }, remember); // giữ phiên đã lưu đồng bộ
    set({ user: next });
  },

  clear: () => {
    clearSession();
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
