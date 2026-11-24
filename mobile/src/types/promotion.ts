export interface ActivePromotion {
  promotionId: number;
  promotionName: string;
  promoType: 'PRODUCT' | 'INVOICE' | 'VOUCHER';
  startDate: string;
  endDate: string;
  isActive: boolean;
  status: 'RUNNING';
}

export interface PublicVoucher {
  promotionId: number;
  voucherCode: string;
  discountPercent: number;
  usageLimit: number | null;
  usedCount: number;
  isDeleted: boolean;
  isAvailable: boolean;
}

export interface ValidateVoucherResult {
  valid: boolean;
  voucherCode: string;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}
