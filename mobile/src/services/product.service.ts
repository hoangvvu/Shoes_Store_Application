import { api } from './api';
import type { Paged, ProductDetail, ProductListItem } from '@/types/product';

export const productService = {
  async list(params?: { q?: string; categoryId?: number; brandId?: number; page?: number; size?: number }): Promise<Paged<ProductListItem>> {
    const { data } = await api.get<Paged<ProductListItem>>('/products', { params });
    return data;
  },

  async getDetail(id: number): Promise<ProductDetail> {
    const { data } = await api.get<ProductDetail>(`/products/${id}`);
    return data;
  },

  async listCategories(): Promise<{ categoryId: number; categoryName: string }[]> {
    const { data } = await api.get<{ categoryId: number; categoryName: string }[]>('/categories');
    return data;
  },
};
