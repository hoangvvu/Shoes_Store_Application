import type { PagedFavorites } from '@/types/review';
import { api } from './api';

export const favoriteService = {
  async list(page: number, size: number): Promise<PagedFavorites> {
    const { data } = await api.get<PagedFavorites>('/me/favorites', { params: { page, size } });
    return data;
  },
  async like(productId: number): Promise<void> {
    await api.put(`/me/favorites/${productId}`);
  },
  async unlike(productId: number): Promise<void> {
    await api.delete(`/me/favorites/${productId}`);
  },
};
