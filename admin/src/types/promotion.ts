export type PromoType = 'PRODUCT' | 'INVOICE' | 'VOUCHER';
export type PromoStatus = 'UPCOMING' | 'RUNNING' | 'EXPIRED' | 'ALL';

export interface Promotion {
  promotionId: number;
  promotionName: string;
  promoType: PromoType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  itemsCount?: number;
  status: 'UPCOMING' | 'RUNNING' | 'EXPIRED';
}

export interface PromotionProduct {
  promotionId: number;
  productId: number;
  productName: string;
  thumbnail: string | null;
  currentPrice: number;
  discountPercent: number;
  salePrice: number;
}

export interface PromotionTier {
  promotionId: number;
  minInvoiceAmount: number;
  discountPercent: number;
}

export interface PromotionVoucher {
  promotionId: number;
  voucherCode: string;
  discountPercent: number;
  usageLimit: number | null;
  usedCount: number;
  isDeleted: boolean;
  deletedAt: string | null;
  isAvailable?: boolean;
}

export interface PromotionDetailResponse {
  promotion: Promotion;
  products?: PromotionProduct[];
  tiers?: PromotionTier[];
  vouchers?: { items: PromotionVoucher[]; total: number };
}

export interface PromotionFormParams {
  promotionName: string;
  promoType: PromoType;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface BatchVoucherParams {
  count: number;
  discountPercent: number;
  usageLimit?: number | null;
  prefix?: string;
  codeLength?: number;
}
