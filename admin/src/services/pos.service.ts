import type { Paged } from '../types/customer';
import type { PaymentMethodOption, PosOrderPayload, PosOrderResult, PosPreview, PosProduct } from '../types/order';
import { api } from './api';

export const posService = {
  async products(p: { q?: string; inStock?: boolean; page: number; size: number }): Promise<Paged<PosProduct>> {
    const { data } = await api.get<Paged<PosProduct>>('/pos/products', {
      params: { q: p.q || undefined, inStock: p.inStock ? 'true' : undefined, page: p.page, size: p.size },
    });
    return data;
  },
  async paymentMethods(): Promise<PaymentMethodOption[]> {
    const { data } = await api.get<PaymentMethodOption[]>('/pos/payment-methods');
    return data;
  },
  /** Backend tính giá, khuyến mãi, voucher, kiểm tồn; không ghi gì vào CSDL. */
  async preview(items: { variantId: number; quantity: number }[], voucherCode?: string): Promise<PosPreview> {
    const { data } = await api.post<PosPreview>('/pos/preview', { items, voucherCode: voucherCode || undefined });
    return data;
  },
  /** `idempotencyKey` giữ nguyên khi thử lại cùng một lần thanh toán để backend không tạo trùng hóa đơn. */
  async createOrder(payload: PosOrderPayload, idempotencyKey: string): Promise<PosOrderResult> {
    const { data } = await api.post<PosOrderResult>('/pos/orders', payload, { headers: { 'Idempotency-Key': idempotencyKey } });
    return data;
  },
};
