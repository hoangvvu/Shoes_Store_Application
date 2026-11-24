import type { Banner, BannerFilter, BannerFormValues } from '../types/banner';
import { api } from './api';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as Partial<T>;

export const bannerService = {
  async list(p?: BannerFilter): Promise<Banner[]> {
    const { data } = await api.get<Banner[]>('/banners', { params: p ? clean(p) : undefined });
    return data;
  },

  async get(id: number): Promise<Banner> {
    const { data } = await api.get<Banner>(`/banners/${id}`);
    return data;
  },

  async create(v: BannerFormValues): Promise<Banner> {
    const { data } = await api.post<Banner>('/banners', v);
    return data;
  },

  async update(id: number, v: Partial<BannerFormValues>): Promise<Banner> {
    const { data } = await api.put<Banner>(`/banners/${id}`, v);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/banners/${id}`);
  },
};
