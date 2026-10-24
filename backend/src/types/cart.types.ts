export type Availability = 'OK' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'UNAVAILABLE';

export interface CartItemRow {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  stockQuantity: number;
  availability: Availability;
}
