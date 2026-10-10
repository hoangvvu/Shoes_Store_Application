import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { SESSION_KEY } from '@/constants/app';
import type { AuthUser } from '@/types/auth';

type Status = 'loading' | 'signedIn' | 'signedOut';
interface Session { accessToken: string; refreshToken: string; user: AuthUser }

interface AuthState {
  status: Status;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrate: () => Promise<void>;
  /** remember = true: lưu vào SecureStore; false: chỉ giữ trong bộ nhớ (thoát app là mất). */
  setSession: (s: Session, remember: boolean) => Promise<void>;
  setAccessToken: (token: string) => Promise<void>;
  setUserName: (fullName: string) => void;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  accessToken: null,
  refreshToken: null,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Session;
        return set({ ...s, status: 'signedIn' });
      }
    } catch {
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    }
    set({ status: 'signedOut' });
  },

  setSession: async (s, remember) => {
    if (remember) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s));
    else await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    set({ ...s, status: 'signedIn' });
  },

  setAccessToken: async (accessToken) => {
    const { user, refreshToken } = get();
    set({ accessToken });
    // chỉ cập nhật SecureStore nếu phiên đang được ghi nhớ
    const saved = await SecureStore.getItemAsync(SESSION_KEY);
    if (saved && user && refreshToken) {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ accessToken, refreshToken, user }));
    }
  },

  setUserName: (fullName) => {
    const user = get().user;
    if (user) set({ user: { ...user, fullName } });
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => undefined);
    set({ status: 'signedOut', user: null, accessToken: null, refreshToken: null });
  },
}));
