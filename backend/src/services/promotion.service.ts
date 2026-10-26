import crypto from 'crypto';
import { withTransaction, type Executor } from '../config/database';
import { AppError } from '../errors/AppError';
import { orderPromotionRepository } from '../repositories/orderPromotion.repository';
import {
  promotionRepository,
  type PromotionProductItem,
  type PromotionRow,
  type PromotionTierItem,
  type PromotionVoucherItem,
} from '../repositories/promotion.repository';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateRandomCode(length = 8, prefix = ''): string {
  const bytes = crypto.randomBytes(length);
  const randomStr = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  return (prefix ? prefix.toUpperCase() + randomStr : randomStr).slice(0, 30);
}

export const promotionService = {
  async listPromotions(params: {
    page?: number;
    size?: number;
    promoType?: string;
    isActive?: boolean;
    status?: 'UPCOMING' | 'RUNNING' | 'EXPIRED' | 'ALL';
    search?: string;
  }): Promise<{ items: PromotionRow[]; total: number; page: number; size: number }> {
    const page = params.page ?? 1;
    const size = params.size ?? 20;
    const res = await promotionRepository.findAll(params);
    return { ...res, page, size };
  },

  async getPromotionDetail(id: number): Promise<{
    promotion: PromotionRow;
    products?: PromotionProductItem[];
    tiers?: PromotionTierItem[];
    vouchers?: { items: PromotionVoucherItem[]; total: number };
  }> {
    const promotion = await promotionRepository.findById(id);
    if (!promotion) throw AppError.notFound('Chương trình khuyến mãi không tồn tại hoặc đã bị xóa');

    let products: PromotionProductItem[] | undefined;
    let tiers: PromotionTierItem[] | undefined;
    let vouchers: { items: PromotionVoucherItem[]; total: number } | undefined;

    if (promotion.promoType === 'PRODUCT') {
      products = await promotionRepository.getProducts(id);
    } else if (promotion.promoType === 'INVOICE') {
      tiers = await promotionRepository.getTiers(id);
    } else if (promotion.promoType === 'VOUCHER') {
      vouchers = await promotionRepository.getVouchers(id, { size: 100 });
    }

    return { promotion, products, tiers, vouchers };
  },

  async createPromotion(data: {
    promotionName: string;
    promoType: 'PRODUCT' | 'INVOICE' | 'VOUCHER';
    startDate: string;
    endDate: string;
    isActive?: boolean;
  }): Promise<PromotionRow> {
    const id = await promotionRepository.create(data);
    const created = await promotionRepository.findById(id);
    if (!created) throw new AppError(500, 'CREATE_PROMOTION_FAILED', 'Không thể tạo chương trình khuyến mãi');
    return created;
  },

  async updatePromotion(
    id: number,
    data: {
      promotionName?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
  ): Promise<PromotionRow> {
    const existing = await promotionRepository.findById(id);
    if (!existing) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');

    const ok = await promotionRepository.update(id, data);
    if (!ok && Object.keys(data).length > 0) {
      throw AppError.badRequest('Cập nhật chương trình khuyến mãi thất bại');
    }

    const updated = await promotionRepository.findById(id);
    return updated!;
  },

  async toggleStatus(id: number, isActive: boolean): Promise<PromotionRow> {
    return this.updatePromotion(id, { isActive });
  },

  async deletePromotion(id: number): Promise<void> {
    const existing = await promotionRepository.findById(id);
    if (!existing) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');

    const ok = await promotionRepository.softDelete(id);
    if (!ok) throw new AppError(500, 'DELETE_PROMOTION_FAILED', 'Xóa chương trình khuyến mãi thất bại');
  },

  async syncProducts(
    promoId: number,
    products: { productId: number; discountPercent: number }[],
  ): Promise<PromotionProductItem[]> {
    const promo = await promotionRepository.findById(promoId);
    if (!promo) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');
    if (promo.promoType !== 'PRODUCT') {
      throw AppError.badRequest('Chỉ chương trình loại PRODUCT mới có thể gán danh sách sản phẩm');
    }

    await withTransaction(async (exec: Executor) => {
      await promotionRepository.syncProducts(promoId, products, exec);
    });

    return promotionRepository.getProducts(promoId);
  },

  async syncTiers(
    promoId: number,
    tiers: { minInvoiceAmount: number; discountPercent: number }[],
  ): Promise<PromotionTierItem[]> {
    const promo = await promotionRepository.findById(promoId);
    if (!promo) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');
    if (promo.promoType !== 'INVOICE') {
      throw AppError.badRequest('Chỉ chương trình loại INVOICE mới có thể thiết lập bậc hóa đơn');
    }

    await withTransaction(async (exec: Executor) => {
      await promotionRepository.syncTiers(promoId, tiers, exec);
    });

    return promotionRepository.getTiers(promoId);
  },

  async listVouchers(
    promoId: number,
    params?: { search?: string; page?: number; size?: number },
  ): Promise<{ items: PromotionVoucherItem[]; total: number }> {
    const promo = await promotionRepository.findById(promoId);
    if (!promo) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');
    if (promo.promoType !== 'VOUCHER') {
      throw AppError.badRequest('Chương trình này không phải loại VOUCHER');
    }
    return promotionRepository.getVouchers(promoId, params);
  },

  async createVoucher(
    promoId: number,
    data: { voucherCode: string; discountPercent: number; usageLimit?: number | null },
  ): Promise<void> {
    const promo = await promotionRepository.findById(promoId);
    if (!promo) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');
    if (promo.promoType !== 'VOUCHER') {
      throw AppError.badRequest('Chỉ chương trình loại VOUCHER mới có thể tạo mã giảm giá');
    }

    const code = data.voucherCode.trim().toUpperCase();
    const exists = await promotionRepository.checkVoucherExists(code);
    if (exists) {
      throw AppError.conflict(`Mã voucher '${code}' đã tồn tại trong hệ thống`);
    }

    await promotionRepository.createVoucher(promoId, {
      ...data,
      voucherCode: code,
    });
  },

  async generateBatchVouchers(
    promoId: number,
    options: {
      count: number;
      discountPercent: number;
      usageLimit?: number | null;
      prefix?: string;
      codeLength?: number;
    },
  ): Promise<{ generatedCount: number; codes: string[] }> {
    const promo = await promotionRepository.findById(promoId);
    if (!promo) throw AppError.notFound('Chương trình khuyến mãi không tồn tại');
    if (promo.promoType !== 'VOUCHER') {
      throw AppError.badRequest('Chỉ chương trình loại VOUCHER mới có thể sinh voucher hàng loạt');
    }

    const length = options.codeLength ?? 8;
    const prefix = options.prefix ?? '';
    const generatedCodes: string[] = [];

    await withTransaction(async (exec: Executor) => {
      for (let i = 0; i < options.count; i++) {
        let code = '';
        let retries = 0;
        let created = false;

        while (retries < 5 && !created) {
          code = generateRandomCode(length, prefix);
          const exists = await promotionRepository.checkVoucherExists(code, exec);
          if (!exists) {
            try {
              await promotionRepository.createVoucher(
                promoId,
                {
                  voucherCode: code,
                  discountPercent: options.discountPercent,
                  usageLimit: options.usageLimit ?? null,
                },
                exec,
              );
              generatedCodes.push(code);
              created = true;
            } catch {
              retries++;
            }
          } else {
            retries++;
          }
        }

        if (!created) {
          throw new AppError(
            500,
            'GENERATE_VOUCHER_COLLISION',
            'Đụng độ mã voucher quá nhiều lần, vui lòng thử lại với độ dài mã lớn hơn',
          );
        }
      }
    });

    return { generatedCount: generatedCodes.length, codes: generatedCodes };
  },

  async toggleVoucherStatus(code: string, isDeleted: boolean): Promise<void> {
    const ok = await promotionRepository.updateVoucherStatus(code.toUpperCase(), isDeleted);
    if (!ok) throw AppError.notFound('Không tìm thấy mã voucher');
  },

  async getActivePromotions(): Promise<PromotionRow[]> {
    return promotionRepository.findActivePromotions();
  },

  async getPublicVouchers(): Promise<PromotionVoucherItem[]> {
    return promotionRepository.findPublicVouchers();
  },

  async validateVoucher(
    code: string,
    totalAmount = 0,
  ): Promise<{
    valid: boolean;
    voucherCode: string;
    discountPercent: number;
    discountAmount: number;
    finalAmount: number;
    message: string;
  }> {
    const cleanCode = code.trim().toUpperCase();
    const voucher = await orderPromotionRepository.findVoucher(cleanCode);

    if (!voucher) {
      throw AppError.badRequest('Mã voucher không tồn tại hoặc chương trình khuyến mãi đã hết hạn', 'VOUCHER_INVALID');
    }

    if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
      throw AppError.badRequest('Mã voucher này đã hết lượt sử dụng', 'VOUCHER_EXHAUSTED');
    }

    const discountAmount = Math.round((totalAmount * voucher.percent) / 100);
    const finalAmount = Math.max(0, totalAmount - discountAmount);

    return {
      valid: true,
      voucherCode: cleanCode,
      discountPercent: voucher.percent,
      discountAmount,
      finalAmount,
      message: `Áp dụng thành công! Giảm ${voucher.percent}%`,
    };
  },
};
