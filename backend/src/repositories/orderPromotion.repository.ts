import { query, sql, type Executor } from '../config/database';

/**
 * Chỉ các truy vấn khuyến mãi mà luồng đặt hàng (M8) cần. Quản lý khuyến mãi là phần M11.
 * "Hôm nay" tính theo GMT+7 vì start_date/end_date là DATE theo giờ địa phương.
 */
const TODAY = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS DATE)`;
const ACTIVE = `p.is_active = 1 AND p.is_deleted = 0 AND ${TODAY} BETWEEN p.start_date AND p.end_date`;

export interface VoucherRow {
  voucherCode: string;
  promotionId: number;
  percent: number;
  usageLimit: number | null;
  usedCount: number;
}

export const orderPromotionRepository = {
  /** Mức giảm % cao nhất đang hiệu lực cho từng sản phẩm (nhiều KM trùng thì lấy MAX, không cộng dồn). */
  async bestProductPercents(productIds: number[], exec?: Executor): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (!productIds.length) return map;
    // productIds là số nguyên đã kiểm soát nên an toàn khi ghép vào IN (...)
    const list = productIds.map((n) => Math.trunc(Number(n))).join(',');
    const r = await query<{ productId: number; percent: number }>(
      `SELECT pp.product_id AS productId, MAX(pp.discount_percent) AS percent
       FROM promotion_products pp JOIN promotions p ON p.promotion_id = pp.promotion_id
       WHERE p.promo_type = 'PRODUCT' AND ${ACTIVE} AND pp.product_id IN (${list})
       GROUP BY pp.product_id`,
      {},
      exec,
    );
    for (const row of r.recordset) map.set(row.productId, Number(row.percent));
    return map;
  },

  /** Mức giảm theo tổng tiền hóa đơn: bậc cao nhất mà tổng tiền đạt được. */
  async bestInvoiceTier(totalAmount: number, exec?: Executor): Promise<{ promotionId: number; percent: number } | null> {
    const r = await query<{ promotionId: number; percent: number }>(
      `SELECT TOP 1 pit.promotion_id AS promotionId, pit.discount_percent AS percent
       FROM promotion_invoice_tiers pit JOIN promotions p ON p.promotion_id = pit.promotion_id
       WHERE p.promo_type = 'INVOICE' AND ${ACTIVE} AND pit.min_invoice_amount <= @total
       ORDER BY pit.discount_percent DESC`,
      { total: [sql.Decimal(18, 2), totalAmount] },
      exec,
    );
    const row = r.recordset[0];
    return row ? { promotionId: row.promotionId, percent: Number(row.percent) } : null;
  },

  /** Voucher còn hiệu lực (KM đang chạy, chưa xóa). Chưa kiểm tra hết lượt. */
  async findVoucher(code: string, exec?: Executor): Promise<VoucherRow | null> {
    const r = await query<VoucherRow>(
      `SELECT pv.voucher_code AS voucherCode, pv.promotion_id AS promotionId, pv.discount_percent AS percent,
              pv.usage_limit AS usageLimit, pv.used_count AS usedCount
       FROM promotion_vouchers pv JOIN promotions p ON p.promotion_id = pv.promotion_id
       WHERE pv.voucher_code = @code AND pv.is_deleted = 0 AND p.promo_type = 'VOUCHER' AND ${ACTIVE}`,
      { code: [sql.VarChar(30), code] },
      exec,
    );
    const row = r.recordset[0];
    return row ? { ...row, percent: Number(row.percent) } : null;
  },

  /** Voucher của đơn đã tạo (giữ nguyên khi sửa đơn, kể cả KM đã hết hạn). */
  async findVoucherPercentAny(code: string, exec?: Executor): Promise<{ promotionId: number; percent: number } | null> {
    const r = await query<{ promotionId: number; percent: number }>(
      `SELECT promotion_id AS promotionId, discount_percent AS percent FROM promotion_vouchers WHERE voucher_code = @code`,
      { code: [sql.VarChar(30), code] },
      exec,
    );
    const row = r.recordset[0];
    return row ? { promotionId: row.promotionId, percent: Number(row.percent) } : null;
  },

  /** Giữ chỗ 1 lượt dùng, nguyên tử. Trả false nếu vừa hết lượt (request đồng thời). */
  async consumeVoucher(code: string, exec?: Executor): Promise<boolean> {
    const r = await query(
      `UPDATE promotion_vouchers SET used_count = used_count + 1
       WHERE voucher_code = @code AND is_deleted = 0 AND (usage_limit IS NULL OR used_count < usage_limit)`,
      { code: [sql.VarChar(30), code] },
      exec,
    );
    return (r.rowsAffected[0] ?? 0) > 0;
  },

  async releaseVoucher(code: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE promotion_vouchers SET used_count = used_count - 1 WHERE voucher_code = @code AND used_count > 0`,
      { code: [sql.VarChar(30), code] },
      exec,
    );
  },
};
