import api from './api';
import {
  ApiResponse,
  Product,
  ProductVariant,
  Category,
  Brand,
  Size,
  Color,
} from '../types';

export const productService = {
  // Products
  getProducts: (params?: {
    q?: string;
    categoryId?: number;
    brandId?: number;
    minPrice?: number;
    maxPrice?: number;
    sizeId?: number;
    colorId?: number;
    isActive?: boolean;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<Product[]>> => {
    return api.get('/products', { params });
  },

  getProductById: (id: number): Promise<ApiResponse<Product>> => {
    return api.get(`/products/${id}`);
  },

  createProduct: (data: {
    productName: string;
    categoryId?: number;
    brandId?: number;
    currentPrice: number;
    unit?: string;
    description?: string;
    imageUrl?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<Product>> => {
    return api.post('/products', data);
  },

  updateProduct: (
    id: number,
    data: Partial<{
      productName: string;
      categoryId: number;
      brandId: number;
      currentPrice: number;
      unit: string;
      description: string;
      imageUrl: string;
      isActive: boolean;
    }>
  ): Promise<ApiResponse<Product>> => {
    return api.put(`/products/${id}`, data);
  },

  toggleActive: (id: number, isActive: boolean): Promise<ApiResponse<Product>> => {
    return api.patch(`/products/${id}/active`, { isActive });
  },

  deleteProduct: (id: number): Promise<ApiResponse<null>> => {
    return api.delete(`/products/${id}`);
  },

  // Variants
  bulkCreateVariants: (
    productId: number,
    data: { sizeIds: number[]; colorIds: number[] }
  ): Promise<ApiResponse<{ createdCount: number; product: Product }>> => {
    return api.post(`/products/${productId}/variants/bulk`, data);
  },

  updateVariant: (
    variantId: number,
    data: { sku: string }
  ): Promise<ApiResponse<ProductVariant>> => {
    return api.put(`/variants/${variantId}`, data);
  },

  deleteVariant: (variantId: number): Promise<ApiResponse<null>> => {
    return api.delete(`/variants/${variantId}`);
  },

  // Catalog: Categories
  getCategories: (): Promise<ApiResponse<Category[]>> => api.get('/categories'),
  createCategory: (data: { categoryName: string }): Promise<ApiResponse<Category>> =>
    api.post('/categories', data),
  updateCategory: (id: number, data: { categoryName: string }): Promise<ApiResponse<Category>> =>
    api.put(`/categories/${id}`, data),
  deleteCategory: (id: number): Promise<ApiResponse<null>> => api.delete(`/categories/${id}`),

  // Catalog: Brands
  getBrands: (): Promise<ApiResponse<Brand[]>> => api.get('/brands'),
  createBrand: (data: { brandName: string }): Promise<ApiResponse<Brand>> =>
    api.post('/brands', data),
  updateBrand: (id: number, data: { brandName: string }): Promise<ApiResponse<Brand>> =>
    api.put(`/brands/${id}`, data),
  deleteBrand: (id: number): Promise<ApiResponse<null>> => api.delete(`/brands/${id}`),

  // Catalog: Sizes
  getSizes: (): Promise<ApiResponse<Size[]>> => api.get('/sizes'),
  createSize: (data: { sizeLabel: string; sortOrder?: number }): Promise<ApiResponse<Size>> =>
    api.post('/sizes', data),
  updateSize: (id: number, data: { sizeLabel: string; sortOrder?: number }): Promise<ApiResponse<Size>> =>
    api.put(`/sizes/${id}`, data),
  deleteSize: (id: number): Promise<ApiResponse<null>> => api.delete(`/sizes/${id}`),

  // Catalog: Colors
  getColors: (): Promise<ApiResponse<Color[]>> => api.get('/colors'),
  createColor: (data: { colorName: string; hexCode?: string }): Promise<ApiResponse<Color>> =>
    api.post('/colors', data),
  updateColor: (id: number, data: { colorName: string; hexCode?: string }): Promise<ApiResponse<Color>> =>
    api.put(`/colors/${id}`, data),
  deleteColor: (id: number): Promise<ApiResponse<null>> => api.delete(`/colors/${id}`),

  // Upload
  uploadImage: (data: { imageBase64: string; fileName?: string }): Promise<ApiResponse<{ url: string }>> =>
    api.post('/uploads', data),
};
