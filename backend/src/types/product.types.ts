export interface ProductListItemRow {
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
  supplierId: number | null;
  supplierName: string | null;
}

export interface ProductDetailRow extends ProductListItemRow {
  description: string | null;
  avgRating: number | null;
  reviewCount: number;
}

export interface VariantRow {
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
