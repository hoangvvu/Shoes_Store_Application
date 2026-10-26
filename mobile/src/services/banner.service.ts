import { api } from './api';
import type { Banner } from '@/types/banner';

export const bannerService = {
  async list(params?: { platform?: string; position?: string; isActive?: boolean }): Promise<Banner[]> {
    const { data } = await api.get<Banner[]>('/banners', { params });
    return data;
  },
};
