import { create } from 'zustand';
import { cartService } from '@/services/cart.service';
import type { Cart } from '@/types/cart';

const EMPTY: Cart = { cartId: null, items: [], lineCount: 0, totalQuantity: 0, subtotal: 0, canCheckout: false };

interface CartState {
  cart: Cart;
  loading: boolean;
  /** Server là nguồn dữ liệu duy nhất: tải lại sau mỗi lần đăng nhập / mở app / vào tab giỏ. */
  refresh: () => Promise<void>;
  /** Dùng ở màn chi tiết sản phẩm (module sản phẩm) – trả cảnh báo nếu có. */
  add: (variantId: number, quantity?: number) => Promise<string | null>;
  setQuantity: (variantId: number, quantity: number) => Promise<string | null>;
  remove: (variantId: number) => Promise<void>;
  clear: () => Promise<void>;
  reset: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: EMPTY,
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      set({ cart: await cartService.get() });
    } finally {
      set({ loading: false });
    }
  },

  add: async (variantId, quantity = 1) => {
    const cart = await cartService.addItem(variantId, quantity);
    set({ cart });
    return cart.warning ?? null;
  },

  setQuantity: async (variantId, quantity) => {
    const cart = await cartService.setQuantity(variantId, quantity);
    set({ cart });
    return cart.warning ?? null;
  },

  remove: async (variantId) => set({ cart: await cartService.removeItem(variantId) }),
  clear: async () => set({ cart: await cartService.clear() }),
  reset: () => set({ cart: EMPTY }),
}));
