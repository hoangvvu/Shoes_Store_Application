export type Availability = 'OK' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'UNAVAILABLE';

export interface CartItem {
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
  lineTotal: number;
  message: string | null;
}

export interface Cart {
  cartId: number | null;
  items: CartItem[];
  lineCount: number;
  totalQuantity: number;
  subtotal: number;
  canCheckout: boolean;
  /** Cảnh báo (không chặn) cho dòng vừa thêm/sửa, ví dụ vượt tồn kho. */
  warning?: string | null;
}

export interface CartValidation {
  valid: boolean;
  empty: boolean;
  issues: { variantId: number; productName: string; availability: Availability; message: string }[];
  cart: Cart;
}
