import type { Cart, CartValidation } from '@/types/cart';
import { api } from './api';

export const cartService = {
  async get(): Promise<Cart> {
    const { data } = await api.get<Cart>('/cart');
    return data;
  },
  async addItem(variantId: number, quantity = 1): Promise<Cart> {
    const { data } = await api.post<Cart>('/cart/items', { variantId, quantity });
    return data;
  },
  async setQuantity(variantId: number, quantity: number): Promise<Cart> {
    const { data } = await api.patch<Cart>(`/cart/items/${variantId}`, { quantity });
    return data;
  },
  async removeItem(variantId: number): Promise<Cart> {
    const { data } = await api.delete<Cart>(`/cart/items/${variantId}`);
    return data;
  },
  async clear(): Promise<Cart> {
    const { data } = await api.delete<Cart>('/cart');
    return data;
  },
  async validate(removeUnavailable = false): Promise<CartValidation> {
    const { data } = await api.post<CartValidation>('/cart/validate', { removeUnavailable });
    return data;
  },
};
