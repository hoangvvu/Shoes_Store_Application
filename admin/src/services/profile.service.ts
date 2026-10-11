import type { EmployeeMe, UpdateProfilePayload } from '../types/profile';
import { api } from './api';

export const profileService = {
  async getMe(): Promise<EmployeeMe> {
    const { data } = await api.get<EmployeeMe>('/me');
    return data;
  },
  async updateMe(payload: UpdateProfilePayload): Promise<EmployeeMe> {
    const { data } = await api.put<EmployeeMe>('/me', payload);
    return data;
  },
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/password', { oldPassword, newPassword });
  },
};
