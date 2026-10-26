import { query, sql, type Executor } from '../config/database';

export interface PromotionRow {
  promotionId: number;
  promotionName: string;
  promoType: 'PRODUCT' | 'INVOICE' | 'VOUCHER';
  startDate: string;
  endDate: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  itemsCount?: number;
  status?: 'UPCOMING' | 'RUNNING' | 'EXPIRED';
}

export interface PromotionProductItem {
  promotionId: number;
  productId: number;
  productName: string;
  thumbnail: string | null;
  currentPrice: number;
  discountPercent: number;
  salePrice: number;
}

export interface PromotionTierItem {
  promotionId: number;
  minInvoiceAmount: number;
  discountPercent: number;
}

export interface PromotionVoucherItem {
  promotionId: number;
  voucherCode: string;
  discountPercent: number;
  usageLimit: number | null;
  usedCount: number;
  isDeleted: boolean;
  deletedAt: string | null;
  isAvailable?: boolean;
}

const TODAY = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS DATE)`;

export const promotionRepository = {
  async findAll(params: {
    page?: number;
    size?: number;
    promoType?: string;
    isActive?: boolean;
    status?: 'UPCOMING' | 'RUNNING' | 'EXPIRED' | 'ALL';
    search?: string;
  }): Promise<{ items: PromotionRow[]; total: number }> {
    const page = Math.max(1, params.page ?? 1);
    const size = Math.max(1, Math.min(100, params.size ?? 20));
    const offset = (page - 1) * size;

    const conditions: string[] = ['p.is_deleted = 0'];
    const sqlParams: Record<string, [any, any]> = {};

    if (params.promoType) {
      conditions.push('p.promo_type = @promoType');
      sqlParams.promoType = [sql.VarChar(10), params.promoType];
    }

    if (params.isActive !== undefined) {
      conditions.push('p.is_active = @isActive');
      sqlParams.isActive = [sql.Bit, params.isActive ? 1 : 0];
    }

    if (params.search) {
      conditions.push('p.promotion_name COLLATE SQL_Latin1_General_CP1_CI_AI LIKE @search COLLATE SQL_Latin1_General_CP1_CI_AI');
      sqlParams.search = [sql.NVarChar(200), `%${params.search}%`];
    }

    if (params.status === 'RUNNING') {
      conditions.push(`p.is_active = 1 AND ${TODAY} BETWEEN p.start_date AND p.end_date`);
    } else if (params.status === 'UPCOMING') {
      conditions.push(`p.start_date > ${TODAY}`);
    } else if (params.status === 'EXPIRED') {
      conditions.push(`p.end_date < ${TODAY}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM promotions p ${whereClause}`,
      sqlParams,
    );
    const total = countRes.recordset[0]?.total ?? 0;

    const listRes = await query<{
      promotionId: number;
      promotionName: string;
      promoType: 'PRODUCT' | 'INVOICE' | 'VOUCHER';
      startDate: string;
      endDate: string;
      isActive: boolean;
      isDeleted: boolean;
      deletedAt: string | null;
      itemsCount: number;
      status: 'UPCOMING' | 'RUNNING' | 'EXPIRED';
    }>(
      `SELECT p.promotion_id AS promotionId,
              p.promotion_name AS promotionName,
              p.promo_type AS promoType,
              CONVERT(VARCHAR(10), p.start_date, 120) AS startDate,
              CONVERT(VARCHAR(10), p.end_date, 120) AS endDate,
              p.is_active AS isActive,
              p.is_deleted AS isDeleted,
              p.deleted_at AS deletedAt,
              CASE 
                WHEN p.promo_type = 'PRODUCT' THEN (SELECT COUNT(*) FROM promotion_products WHERE promotion_id = p.promotion_id)
                WHEN p.promo_type = 'INVOICE' THEN (SELECT COUNT(*) FROM promotion_invoice_tiers WHERE promotion_id = p.promotion_id)
                WHEN p.promo_type = 'VOUCHER' THEN (SELECT COUNT(*) FROM promotion_vouchers WHERE promotion_id = p.promotion_id AND is_deleted = 0)
                ELSE 0
              END AS itemsCount,
              CASE
                WHEN p.start_date > ${TODAY} THEN 'UPCOMING'
                WHEN p.end_date < ${TODAY} THEN 'EXPIRED'
                ELSE 'RUNNING'
              END AS [status]
       FROM promotions p
       ${whereClause}
       ORDER BY p.promotion_id DESC
       OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`,
      sqlParams,
    );

    return { items: listRes.recordset, total };
  },

  async findById(id: number): Promise<PromotionRow | null> {
    const res = await query<PromotionRow>(
      `SELECT p.promotion_id AS promotionId,
              p.promotion_name AS promotionName,
              p.promo_type AS promoType,
              CONVERT(VARCHAR(10), p.start_date, 120) AS startDate,
              CONVERT(VARCHAR(10), p.end_date, 120) AS endDate,
              p.is_active AS isActive,
              p.is_deleted AS isDeleted,
              p.deleted_at AS deletedAt,
              CASE
                WHEN p.start_date > ${TODAY} THEN 'UPCOMING'
                WHEN p.end_date < ${TODAY} THEN 'EXPIRED'
                ELSE 'RUNNING'
              END AS [status]
       FROM promotions p
       WHERE p.promotion_id = @id AND p.is_deleted = 0`,
      { id: [sql.Int, id] },
    );
    return res.recordset[0] ?? null;
  },

  async getProducts(promotionId: number): Promise<PromotionProductItem[]> {
    const res = await query<PromotionProductItem>(
      `SELECT pp.promotion_id AS promotionId,
              pp.product_id AS productId,
              p.product_name AS productName,
              p.image_url AS thumbnail,
              p.current_price AS currentPrice,
              pp.discount_percent AS discountPercent,
              ROUND(p.current_price * (1.0 - pp.discount_percent / 100.0), 0) AS salePrice
       FROM promotion_products pp
       JOIN products p ON p.product_id = pp.product_id
       WHERE pp.promotion_id = @promotionId
       ORDER BY p.product_name ASC`,
      { promotionId: [sql.Int, promotionId] },
    );
    return res.recordset.map((r) => ({
      ...r,
      currentPrice: Number(r.currentPrice),
      discountPercent: Number(r.discountPercent),
      salePrice: Number(r.salePrice),
    }));
  },

  async getTiers(promotionId: number): Promise<PromotionTierItem[]> {
    const res = await query<PromotionTierItem>(
      `SELECT promotion_id AS promotionId,
              min_invoice_amount AS minInvoiceAmount,
              discount_percent AS discountPercent
       FROM promotion_invoice_tiers
       WHERE promotion_id = @promotionId
       ORDER BY min_invoice_amount ASC`,
      { promotionId: [sql.Int, promotionId] },
    );
    return res.recordset.map((r) => ({
      ...r,
      minInvoiceAmount: Number(r.minInvoiceAmount),
      discountPercent: Number(r.discountPercent),
    }));
  },

  async getVouchers(
    promotionId: number,
    params?: { search?: string; page?: number; size?: number },
  ): Promise<{ items: PromotionVoucherItem[]; total: number }> {
    const page = Math.max(1, params?.page ?? 1);
    const size = Math.max(1, Math.min(100, params?.size ?? 50));
    const offset = (page - 1) * size;

    const conditions: string[] = ['pv.promotion_id = @promotionId'];
    const sqlParams: Record<string, [any, any]> = {
      promotionId: [sql.Int, promotionId],
    };

    if (params?.search) {
      conditions.push('pv.voucher_code LIKE @search');
      sqlParams.search = [sql.VarChar(30), `%${params.search}%`];
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM promotion_vouchers pv ${where}`,
      sqlParams,
    );
    const total = countRes.recordset[0]?.total ?? 0;

    const listRes = await query<PromotionVoucherItem>(
      `SELECT pv.promotion_id AS promotionId,
              pv.voucher_code AS voucherCode,
              pv.discount_percent AS discountPercent,
              pv.usage_limit AS usageLimit,
              pv.used_count AS usedCount,
              pv.is_deleted AS isDeleted,
              pv.deleted_at AS deletedAt,
              CASE
                WHEN pv.is_deleted = 1 THEN 0
                WHEN pv.usage_limit IS NOT NULL AND pv.used_count >= pv.usage_limit THEN 0
                ELSE 1
              END AS isAvailable
       FROM promotion_vouchers pv
       ${where}
       ORDER BY pv.voucher_code ASC
       OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`,
      sqlParams,
    );

    return {
      items: listRes.recordset.map((r) => ({
        ...r,
        discountPercent: Number(r.discountPercent),
        usageLimit: r.usageLimit !== null ? Number(r.usageLimit) : null,
        usedCount: Number(r.usedCount),
        isAvailable: Boolean(r.isAvailable),
      })),
      total,
    };
  },

  async create(
    data: {
      promotionName: string;
      promoType: 'PRODUCT' | 'INVOICE' | 'VOUCHER';
      startDate: string;
      endDate: string;
      isActive?: boolean;
    },
    exec?: Executor,
  ): Promise<number> {
    const res = await query<{ promotionId: number }>(
      `INSERT INTO promotions (promotion_name, promo_type, start_date, end_date, is_active)
       OUTPUT INSERTED.promotion_id AS promotionId
       VALUES (@name, @type, @start, @end, @active)`,
      {
        name: [sql.NVarChar(150), data.promotionName],
        type: [sql.VarChar(10), data.promoType],
        start: [sql.Date, data.startDate],
        end: [sql.Date, data.endDate],
        active: [sql.Bit, data.isActive ?? true ? 1 : 0],
      },
      exec,
    );
    return res.recordset[0].promotionId;
  },

  async update(
    id: number,
    data: {
      promotionName?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    },
    exec?: Executor,
  ): Promise<boolean> {
    const fields: string[] = [];
    const sqlParams: Record<string, [any, any]> = { id: [sql.Int, id] };

    if (data.promotionName !== undefined) {
      fields.push('promotion_name = @name');
      sqlParams.name = [sql.NVarChar(150), data.promotionName];
    }
    if (data.startDate !== undefined) {
      fields.push('start_date = @start');
      sqlParams.start = [sql.Date, data.startDate];
    }
    if (data.endDate !== undefined) {
      fields.push('end_date = @end');
      sqlParams.end = [sql.Date, data.endDate];
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = @active');
      sqlParams.active = [sql.Bit, data.isActive ? 1 : 0];
    }

    if (!fields.length) return false;

    const res = await query(
      `UPDATE promotions SET ${fields.join(', ')} WHERE promotion_id = @id AND is_deleted = 0`,
      sqlParams,
      exec,
    );
    return (res.rowsAffected[0] ?? 0) > 0;
  },

  async softDelete(id: number, exec?: Executor): Promise<boolean> {
    const res = await query(
      `UPDATE promotions SET is_deleted = 1, deleted_at = SYSDATETIME() WHERE promotion_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id] },
      exec,
    );
    return (res.rowsAffected[0] ?? 0) > 0;
  },

  async syncProducts(
    promoId: number,
    products: { productId: number; discountPercent: number }[],
    exec?: Executor,
  ): Promise<void> {
    await query(`DELETE FROM promotion_products WHERE promotion_id = @id`, { id: [sql.Int, promoId] }, exec);

    for (const p of products) {
      await query(
        `INSERT INTO promotion_products (promotion_id, product_id, discount_percent)
         VALUES (@promoId, @productId, @discountPercent)`,
        {
          promoId: [sql.Int, promoId],
          productId: [sql.Int, p.productId],
          discountPercent: [sql.Decimal(5, 2), p.discountPercent],
        },
        exec,
      );
    }
  },

  async syncTiers(
    promoId: number,
    tiers: { minInvoiceAmount: number; discountPercent: number }[],
    exec?: Executor,
  ): Promise<void> {
    await query(`DELETE FROM promotion_invoice_tiers WHERE promotion_id = @id`, { id: [sql.Int, promoId] }, exec);

    for (const t of tiers) {
      await query(
        `INSERT INTO promotion_invoice_tiers (promotion_id, min_invoice_amount, discount_percent)
         VALUES (@promoId, @minInvoiceAmount, @discountPercent)`,
        {
          promoId: [sql.Int, promoId],
          minInvoiceAmount: [sql.Decimal(18, 2), t.minInvoiceAmount],
          discountPercent: [sql.Decimal(5, 2), t.discountPercent],
        },
        exec,
      );
    }
  },

  async createVoucher(
    promoId: number,
    voucher: { voucherCode: string; discountPercent: number; usageLimit?: number | null },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `INSERT INTO promotion_vouchers (promotion_id, voucher_code, discount_percent, usage_limit, used_count, is_deleted)
       VALUES (@promoId, @code, @pct, @limit, 0, 0)`,
      {
        promoId: [sql.Int, promoId],
        code: [sql.VarChar(30), voucher.voucherCode],
        pct: [sql.Decimal(5, 2), voucher.discountPercent],
        limit: [sql.Int, voucher.usageLimit ?? null],
      },
      exec,
    );
  },

  async checkVoucherExists(code: string, exec?: Executor): Promise<boolean> {
    const res = await query<{ count: number }>(
      `SELECT COUNT(*) AS count FROM promotion_vouchers WHERE voucher_code = @code`,
      { code: [sql.VarChar(30), code] },
      exec,
    );
    return (res.recordset[0]?.count ?? 0) > 0;
  },

  async updateVoucherStatus(code: string, isDeleted: boolean, exec?: Executor): Promise<boolean> {
    const res = await query(
      `UPDATE promotion_vouchers
       SET is_deleted = @isDeleted, deleted_at = CASE WHEN @isDeleted = 1 THEN SYSDATETIME() ELSE NULL END
       WHERE voucher_code = @code`,
      {
        code: [sql.VarChar(30), code],
        isDeleted: [sql.Bit, isDeleted ? 1 : 0],
      },
      exec,
    );
    return (res.rowsAffected[0] ?? 0) > 0;
  },

  async findActivePromotions(): Promise<PromotionRow[]> {
    const res = await query<PromotionRow>(
      `SELECT p.promotion_id AS promotionId,
              p.promotion_name AS promotionName,
              p.promo_type AS promoType,
              CONVERT(VARCHAR(10), p.start_date, 120) AS startDate,
              CONVERT(VARCHAR(10), p.end_date, 120) AS endDate,
              p.is_active AS isActive,
              p.is_deleted AS isDeleted,
              p.deleted_at AS deletedAt,
              'RUNNING' AS [status]
       FROM promotions p
       WHERE p.is_deleted = 0 AND p.is_active = 1 AND ${TODAY} BETWEEN p.start_date AND p.end_date
       ORDER BY p.end_date ASC`,
    );
    return res.recordset;
  },

  async findPublicVouchers(): Promise<PromotionVoucherItem[]> {
    const res = await query<PromotionVoucherItem>(
      `SELECT pv.promotion_id AS promotionId,
              pv.voucher_code AS voucherCode,
              pv.discount_percent AS discountPercent,
              pv.usage_limit AS usageLimit,
              pv.used_count AS usedCount,
              pv.is_deleted AS isDeleted,
              pv.deleted_at AS deletedAt
       FROM promotion_vouchers pv
       JOIN promotions p ON p.promotion_id = pv.promotion_id
       WHERE pv.is_deleted = 0 AND p.is_deleted = 0 AND p.is_active = 1 AND p.promo_type = 'VOUCHER'
         AND ${TODAY} BETWEEN p.start_date AND p.end_date
         AND (pv.usage_limit IS NULL OR pv.used_count < pv.usage_limit)
       ORDER BY pv.discount_percent DESC`,
    );
    return res.recordset.map((r) => ({
      ...r,
      discountPercent: Number(r.discountPercent),
      usageLimit: r.usageLimit !== null ? Number(r.usageLimit) : null,
      usedCount: Number(r.usedCount),
      isAvailable: true,
    }));
  },
};
