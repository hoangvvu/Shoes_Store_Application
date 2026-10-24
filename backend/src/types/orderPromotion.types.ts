export interface VoucherRow {
  voucherCode: string;
  promotionId: number;
  percent: number;
  usageLimit: number | null;
  usedCount: number;
}
