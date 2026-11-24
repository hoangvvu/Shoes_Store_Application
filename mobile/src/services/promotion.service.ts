import type { ActivePromotion, PublicVoucher, ValidateVoucherResult } from '@/types/promotion';
import { api } from './api';

export const promotionService = {
  async getActivePromotions(): Promise<ActivePromotion[]> {
    const { data } = await api.get<{ success: boolean; data: ActivePromotion[] }>('/promotions/active');
    return data.data;
  },

  async getPublicVouchers(): Promise<PublicVoucher[]> {
    const { data } = await api.get<{ success: boolean; data: PublicVoucher[] }>('/vouchers/public');
    return data.data;
  },

  async validateVoucher(voucherCode: string, totalAmount = 0): Promise<ValidateVoucherResult> {
    const { data } = await api.post<{ success: boolean; data: ValidateVoucherResult }>('/vouchers/validate', {
      voucherCode,
      totalAmount,
    });
    return data.data;
  },
};
