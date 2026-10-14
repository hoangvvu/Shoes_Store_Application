import type { Executor } from '../config/database';
import { orderPromotionRepository } from '../repositories/orderPromotion.repository';
import { orderRepository, type SaleVariantRow } from '../repositories/order.repository';

export interface PricedLine extends SaleVariantRow {
  quantity: number;
  discountPercent: number;
  lineGross: number;
  lineDiscount: number;
  lineTotal: number;
}

export interface UnavailableLine {
  variantId: number;
  reason: 'NOT_FOUND' | 'UNAVAILABLE';
}

export type VoucherStatus = 'NONE' | 'OK' | 'NOT_FOUND' | 'EXHAUSTED' | 'NOT_APPLIED';

export interface InvoiceDiscount {
  percent: number;
  amount: number;
  source: 'VOUCHER' | 'TIER' | null;
  promotionId: number | null;
  /** Chỉ có giá trị khi voucher thực sự được áp dụng (và sẽ bị trừ 1 lượt). */
  voucherCode: string | null;
  voucherStatus: VoucherStatus;
}

export const VOUCHER_MESSAGE: Record<VoucherStatus, string> = {
  NONE: '',
  OK: 'Đã áp dụng voucher',
  NOT_FOUND: 'Mã voucher không tồn tại hoặc đã hết hạn',
  EXHAUSTED: 'Mã voucher đã hết lượt sử dụng',
  NOT_APPLIED: 'Đã áp dụng ưu đãi hóa đơn có mức giảm cao hơn voucher',
};

/**
 * Tính giá từng dòng: giá = products.current_price tại thời điểm đặt (không lấy giá từ client),
 * giảm theo % khuyến mãi sản phẩm cao nhất đang hiệu lực (MAX, không cộng dồn).
 */
export async function priceLines(
  lines: { variantId: number; quantity: number }[],
  exec?: Executor,
): Promise<{ priced: PricedLine[]; unavailable: UnavailableLine[] }> {
  const rows = await orderRepository.getSaleVariants(lines.map((l) => l.variantId), exec);
  const byId = new Map(rows.map((r) => [r.variantId, r]));
  const sellable = rows.filter((r) => r.sellable);
  const percents = await orderPromotionRepository.bestProductPercents([...new Set(sellable.map((r) => r.productId))], exec);

  const priced: PricedLine[] = [];
  const unavailable: UnavailableLine[] = [];
  for (const l of lines) {
    const v = byId.get(l.variantId);
    if (!v) unavailable.push({ variantId: l.variantId, reason: 'NOT_FOUND' });
    else if (!v.sellable) unavailable.push({ variantId: l.variantId, reason: 'UNAVAILABLE' });
    else {
      const pct = percents.get(v.productId) ?? 0;
      const gross = l.quantity * v.unitPrice;
      const discount = Math.round((gross * pct) / 100);
      priced.push({ ...v, quantity: l.quantity, discountPercent: pct, lineGross: gross, lineDiscount: discount, lineTotal: gross - discount });
    }
  }
  return { priced, unavailable };
}

/**
 * Giảm giá cấp hóa đơn = MAX(mức theo tổng tiền, voucher). Voucher chỉ được áp dụng (và trừ lượt) khi
 * hợp lệ và không thấp hơn mức theo tổng tiền.
 */
export async function computeInvoiceDiscount(
  totalAmount: number,
  voucherCode: string | undefined,
  exec?: Executor,
): Promise<InvoiceDiscount> {
  const tier = await orderPromotionRepository.bestInvoiceTier(totalAmount, exec);
  const voucher = voucherCode ? await orderPromotionRepository.findVoucher(voucherCode, exec) : null;

  let voucherStatus: VoucherStatus = 'NONE';
  if (voucherCode) {
    if (!voucher) voucherStatus = 'NOT_FOUND';
    else if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) voucherStatus = 'EXHAUSTED';
    else voucherStatus = 'OK';
  }

  const voucherPct = voucherStatus === 'OK' ? voucher!.percent : 0;
  const tierPct = tier?.percent ?? 0;

  let source: InvoiceDiscount['source'] = null;
  let percent = 0;
  let promotionId: number | null = null;
  let appliedVoucher: string | null = null;

  if (voucherPct > 0 && voucherPct >= tierPct) {
    source = 'VOUCHER';
    percent = voucherPct;
    promotionId = voucher!.promotionId;
    appliedVoucher = voucher!.voucherCode;
  } else if (tierPct > 0) {
    source = 'TIER';
    percent = tierPct;
    promotionId = tier!.promotionId;
    if (voucherStatus === 'OK') voucherStatus = 'NOT_APPLIED';
  }

  return {
    percent,
    amount: Math.round((totalAmount * percent) / 100),
    source,
    promotionId,
    voucherCode: appliedVoucher,
    voucherStatus,
  };
}
