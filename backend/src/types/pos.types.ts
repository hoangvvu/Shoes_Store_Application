export interface PosVariantRow {
  variantId: number;
  sku: string;
  sizeLabel: string;
  colorName: string;
  hexCode: string | null;
  stockQuantity: number;
}

export interface PosProductRow {
  productId: number;
  productName: string;
  imageUrl: string | null;
  unitPrice: number;
  categoryName: string | null;
  brandName: string | null;
}

export interface PaymentMethodOption {
  methodCode: string;
  methodName: string;
  isOnline: boolean;
}
