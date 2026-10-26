import type {
  BatchVoucherParams,
  Promotion,
  PromotionDetailResponse,
  PromotionFormParams,
  PromotionProduct,
  PromotionTier,
  PromotionVoucher,
} from '../types/promotion';
import { api } from './api';

export const promotionService = {
  async list(params?: {
    page?: number;
    size?: number;
    promoType?: string;
    isActive?: boolean;
    status?: string;
    search?: string;
  }): Promise<{ items: Promotion[]; total: number; page: number; size: number }> {
    const { data } = await api.get('/promotions', { params });
    return data.data;
  },

  async get(id: number): Promise<PromotionDetailResponse> {
    const { data } = await api.get(`/promotions/${id}`);
    return data.data;
  },

  async create(form: PromotionFormParams): Promise<Promotion> {
    const { data } = await api.post('/promotions', form);
    return data.data;
  },

  async update(id: number, form: Partial<PromotionFormParams>): Promise<Promotion> {
    const { data } = await api.put(`/promotions/${id}`, form);
    return data.data;
  },

  async toggleActive(id: number, isActive: boolean): Promise<void> {
    await api.patch(`/promotions/${id}/status`, { isActive });
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/promotions/${id}`);
  },

  async syncProducts(
    id: number,
    products: { productId: number; discountPercent: number }[],
  ): Promise<PromotionProduct[]> {
    const { data } = await api.put(`/promotions/${id}/products`, { products });
    return data.data;
  },

  async syncTiers(
    id: number,
    tiers: { minInvoiceAmount: number; discountPercent: number }[],
  ): Promise<PromotionTier[]> {
    const { data } = await api.put(`/promotions/${id}/tiers`, { tiers });
    return data.data;
  },

  async listVouchers(
    id: number,
    params?: { search?: string; page?: number; size?: number },
  ): Promise<{ items: PromotionVoucher[]; total: number }> {
    const { data } = await api.get(`/promotions/${id}/vouchers`, { params });
    return data.data;
  },

  async createVoucher(
    id: number,
    voucher: { voucherCode: string; discountPercent: number; usageLimit?: number | null },
  ): Promise<void> {
    await api.post(`/promotions/${id}/vouchers`, voucher);
  },

  async generateBatchVouchers(
    id: number,
    params: BatchVoucherParams,
  ): Promise<{ generatedCount: number; codes: string[] }> {
    const { data } = await api.post(`/promotions/${id}/vouchers/generate-batch`, params);
    return data.data;
  },

  async toggleVoucherStatus(code: string, isDeleted: boolean): Promise<void> {
    await api.patch(`/vouchers/${code}/status`, { isDeleted });
  },
};
