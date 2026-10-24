/** M4 – Danh mục, thương hiệu, size, màu, sản phẩm và biến thể. */
export interface Category {
  categoryId: number;
  categoryName: string;
}

export interface Brand {
  brandId: number;
  brandName: string;
}

export interface Size {
  sizeId: number;
  sizeLabel: string;
  sortOrder: number;
}

export interface Color {
  colorId: number;
  colorName: string;
  hexCode: string | null;
}

export interface ProductVariant {
  variantId: number;
  productId: number;
  sku: string;
  stockQuantity: number;
  sizeId: number;
  sizeLabel: string;
  colorId: number;
  colorName: string;
  hexCode: string | null;
}

export interface ProductListItem {
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  brandId: number | null;
  brandName: string | null;
  currentPrice: number;
  unit: string;
  imageUrl: string | null;
  isActive: boolean;
  totalStock: number;
  variantCount: number;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  /** Giá sau khuyến mãi đang hiệu lực (M11), nếu có. */
  finalPrice?: number | null;
  avgRating?: number | null;
  reviewCount?: number;
  variants: ProductVariant[];
}

export interface ProductFormValues {
  productName: string;
  categoryId: number | null;
  brandId: number | null;
  currentPrice: number;
  unit: string;
  description: string;
  imageUrl: string;
}

export interface ProductListParams {
  q?: string;
  categoryId?: number;
  brandId?: number;
  isActive?: boolean;
  page: number;
  size: number;
}
