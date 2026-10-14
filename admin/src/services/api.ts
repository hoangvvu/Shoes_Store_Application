import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../config/env';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Các endpoint không cần token: không thử refresh (tránh lặp vô hạn). /auth/password cần token nên vẫn được refresh.
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/forgot', '/auth/reset', '/auth/logout'];

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setAccessToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('no refresh token');
  // dùng axios trần để không đi qua interceptor của `api` (tránh lặp vô hạn)
  const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, { refreshToken });
  setAccessToken(data.accessToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = PUBLIC_AUTH_PATHS.some((u) => original?.url?.startsWith(u));
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
      throw error;
    }
    original._retried = true;
    try {
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      useAuthStore.getState().clear(); // refresh hết hạn -> ProtectedRoute đưa về /login
      throw error;
    }
  },
);
