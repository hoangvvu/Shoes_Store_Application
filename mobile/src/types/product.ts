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
  finalPrice?: number | null;
  avgRating?: number | null;
  reviewCount?: number;
  variants: ProductVariant[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
