import { api } from './api';
import type { Paged, ProductDetail, ProductListItem } from '@/types/product';

export interface ProductListParams {
  q?: string;
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  size?: number;
}

export interface BrandItem {
  brandId: number;
  brandName: string;
}

export interface SizeItem {
  sizeId: number;
  sizeLabel: string;
  sortOrder?: number;
}

export interface ColorItem {
  colorId: number;
  colorName: string;
  hexCode: string | null;
}

export const productService = {
  async list(params?: ProductListParams): Promise<Paged<ProductListItem>> {
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

  async listBrands(): Promise<BrandItem[]> {
    const { data } = await api.get<BrandItem[]>('/brands');
    return data;
  },

  async listSizes(): Promise<SizeItem[]> {
    const { data } = await api.get<SizeItem[]>('/sizes');
    return data;
  },

  async listColors(): Promise<ColorItem[]> {
    const { data } = await api.get<ColorItem[]>('/colors');
    return data;
  },
};

