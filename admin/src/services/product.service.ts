import type { Paged } from '../types/customer';
import type {
  Brand,
  Category,
  Color,
  ProductDetail,
  ProductFormValues,
  ProductListItem,
  ProductListParams,
  ProductVariant,
  Size,
} from '../types/product';
import { api } from './api';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null)) as Partial<T>;

/** M4 – Sản phẩm và biến thể. */
export const productService = {
  async list(p: ProductListParams): Promise<Paged<ProductListItem>> {
    const { data } = await api.get<Paged<ProductListItem>>('/products', { params: clean(p) });
    return data;
  },
  async get(id: number): Promise<ProductDetail> {
    const { data } = await api.get<ProductDetail>(`/products/${id}`);
    return data;
  },
  async create(v: ProductFormValues): Promise<ProductDetail> {
    const { data } = await api.post<ProductDetail>('/products', v);
    return data;
  },
  /** Đổi giá: trigger tự ghi audit PRODUCT_PRICE_CHANGE (M4 #6). */
  async update(id: number, v: Partial<ProductFormValues>): Promise<ProductDetail> {
    const { data } = await api.put<ProductDetail>(`/products/${id}`, v);
    return data;
  },
  async setActive(id: number, isActive: boolean): Promise<void> {
    await api.patch(`/products/${id}/active`, { isActive });
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/products/${id}`);
  },
  /** Sinh tích Descartes size × màu, SKU tự động, tồn = 0 (M4 #9). */
  async bulkVariants(productId: number, sizeIds: number[], colorIds: number[]): Promise<{ created: number }> {
    const { data } = await api.post<{ created: number }>(`/products/${productId}/variants/bulk`, { sizeIds, colorIds });
    return data;
  },
  async updateVariant(variantId: number, sku: string): Promise<ProductVariant> {
    const { data } = await api.put<ProductVariant>(`/variants/${variantId}`, { sku });
    return data;
  },
  async removeVariant(variantId: number): Promise<void> {
    await api.delete(`/variants/${variantId}`);
  },
};

type CatalogKind = 'categories' | 'brands' | 'sizes' | 'colors';
interface CatalogMap {
  categories: Category;
  brands: Brand;
  sizes: Size;
  colors: Color;
}

/** M4 #1–4 – Danh mục, thương hiệu, size, màu (CRUD, xóa mềm). */
export const catalogService = {
  async list<K extends CatalogKind>(kind: K): Promise<CatalogMap[K][]> {
    const { data } = await api.get<CatalogMap[K][]>(`/${kind}`);
    return data;
  },
  async create<K extends CatalogKind>(kind: K, v: Record<string, unknown>) {
    const { data } = await api.post<CatalogMap[K]>(`/${kind}`, v);
    return data;
  },
  async update<K extends CatalogKind>(kind: K, id: number, v: Record<string, unknown>) {
    const { data } = await api.put<CatalogMap[K]>(`/${kind}/${id}`, v);
    return data;
  },
  async remove(kind: CatalogKind, id: number): Promise<void> {
    await api.delete(`/${kind}/${id}`);
  },
};
