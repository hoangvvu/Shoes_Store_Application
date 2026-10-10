import type { LoginPayload, LoginResponse, MeResponse, RegisterPayload } from '@/types/auth';
import { api } from './api';

export const authService = {
  // portal: 'customer' -> backend từ chối tài khoản nhân viên/admin
  async login(p: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', { ...p, portal: 'customer' });
    return data;
  },
  async register(p: RegisterPayload): Promise<void> {
    await api.post('/auth/register', p);
  },
  async logout(): Promise<void> {
    await api.post('/auth/logout').catch(() => undefined);
  },
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/password', { oldPassword, newPassword });
  },
  async forgot(username: string): Promise<string> {
    const { data } = await api.post<{ message: string }>('/auth/forgot', { username });
    return data.message;
  },
  async reset(username: string, otp: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset', { username, otp, newPassword });
  },
  async getMe(): Promise<MeResponse> {
    const { data } = await api.get<MeResponse>('/me');
    return data;
  },
  async updateMe(p: { fullName?: string; phone?: string }): Promise<MeResponse> {
    const { data } = await api.put<MeResponse>('/me', p);
    return data;
  },
};
