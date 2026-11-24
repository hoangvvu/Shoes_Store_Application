import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_FALLBACK_URLS, API_URL, setActiveApiUrl } from '@/config/env';
import { useAuthStore } from '@/store/useAuthStore';

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  config.baseURL = API_URL;
  config.headers['ngrok-skip-browser-warning'] = 'true';
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setAccessToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('no refresh token');
  const { data } = await axios.post<{ accessToken: string }>(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'ngrok-skip-browser-warning': 'true' } },
  );
  await setAccessToken(data.accessToken);
  return data.accessToken;
}

type RetryConfig = InternalAxiosRequestConfig & {
  _retried?: boolean;
  _fallbackIdx?: number;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;

    // Tự động thử kết nối sang URL dự phòng (ngrok <-> LAN IP) nếu lỗi mạng hoặc tunnel chưa bật
    const isNetworkOrGatewayError =
      !error.response || error.response.status === 502 || error.response.status === 504;

    if (original && isNetworkOrGatewayError) {
      const nextIdx = (original._fallbackIdx ?? 0) + 1;
      if (nextIdx < API_FALLBACK_URLS.length) {
        const candidateUrl = API_FALLBACK_URLS[nextIdx];
        original._fallbackIdx = nextIdx;
        original.baseURL = candidateUrl;
        setActiveApiUrl(candidateUrl);
        api.defaults.baseURL = candidateUrl;
        return api(original);
      }
    }

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
