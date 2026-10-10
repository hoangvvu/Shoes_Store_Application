import type { LoginPayload, LoginResponse } from '../types/auth';
import { api } from './api';

export const authService = {
  // portal: 'staff' -> backend từ chối tài khoản khách hàng
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { ...payload, portal: 'staff' });
    return data;
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout').catch(() => undefined);
  },
};
