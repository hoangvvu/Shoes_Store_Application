import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/config/env';
import { useAuthStore } from '@/store/useAuthStore';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setAccessToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('no refresh token');
  const { data } = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, { refreshToken });
  await setAccessToken(data.accessToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.startsWith('/auth/');
    if (error.response?.status !== 401 || !original || original._retried || isAuthCall) throw error;

    original._retried = true;
    try {
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      await useAuthStore.getState().clear(); // guard ở _layout đưa về màn đăng nhập
      throw error;
    }
  },
);
