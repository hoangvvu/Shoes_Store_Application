import { query, sql, type Executor } from '../config/database';
import { likePattern } from '../utils/pagination';

export interface StockItemRow {
  variantId: number;
  productId: number;
  sku: string;
  stockQuantity: number;
  productName: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
  brandName: string | null;
  sizeLabel: string;
  colorName: string;
  hexCode: string | null;
}

export interface LedgerEntryRow {
  transactionId: number;
  transactionType: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: Date;
  purchaseReceiptId: number | null;
  invoiceId: number | null;
  returnId: number | null;
  createdByName: string | null;
}

export const inventoryRepository = {
  async listStock(
    p: { q?: string; lowStockOnly?: boolean; threshold?: number; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: StockItemRow[]; total: number }> {
    const offset = (p.page - 1) * p.size;
    const qLike = p.q ? likePattern(p.q) : null;
    const threshold = p.threshold ?? 5;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors col ON col.color_id = v.color_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
         AND (@q IS NULL OR p.product_name COLLATE Vietnamese_CI_AI LIKE @qLike OR v.sku LIKE @qLike)
         AND (@lowOnly = 0 OR v.stock_quantity <= @threshold)`,
      {
        q: [sql.NVarChar(200), p.q ?? null],
        qLike: [sql.NVarChar(202), qLike],
        lowOnly: [sql.Bit, p.lowStockOnly ? 1 : 0],
        threshold: [sql.Int, threshold],
      },
      exec,
    );

    const rowsRes = await query<StockItemRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, v.sku,
              v.stock_quantity AS stockQuantity, p.product_name AS productName,
              p.image_url AS imageUrl, p.is_active AS isActive,
              c.category_name AS categoryName, b.brand_name AS brandName,
              s.size_label AS sizeLabel, col.color_name AS colorName, col.hex_code AS hexCode
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors col ON col.color_id = v.color_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
         AND (@q IS NULL OR p.product_name COLLATE Vietnamese_CI_AI LIKE @qLike OR v.sku LIKE @qLike)
         AND (@lowOnly = 0 OR v.stock_quantity <= @threshold)
       ORDER BY v.stock_quantity ASC, v.variant_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        q: [sql.NVarChar(200), p.q ?? null],
        qLike: [sql.NVarChar(202), qLike],
        lowOnly: [sql.Bit, p.lowStockOnly ? 1 : 0],
        threshold: [sql.Int, threshold],
        offset: [sql.Int, offset],
        size: [sql.Int, p.size],
      },
      exec,
    );

    return {
      rows: rowsRes.recordset.map((r) => ({
        ...r,
        stockQuantity: Number(r.stockQuantity),
        isActive: Boolean(r.isActive),
      })),
      total: countRes.recordset[0]?.total ?? 0,
    };
  },

  async listLowStock(threshold = 5, exec?: Executor): Promise<StockItemRow[]> {
    const r = await query<StockItemRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, v.sku,
              v.stock_quantity AS stockQuantity, p.product_name AS productName,
              p.image_url AS imageUrl, p.is_active AS isActive,
              c.category_name AS categoryName, b.brand_name AS brandName,
              s.size_label AS sizeLabel, col.color_name AS colorName, col.hex_code AS hexCode
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors col ON col.color_id = v.color_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
         AND v.stock_quantity <= @threshold
       ORDER BY v.stock_quantity ASC, v.variant_id ASC`,
      { threshold: [sql.Int, threshold] },
      exec,
    );
    return r.recordset.map((row) => ({
      ...row,
      stockQuantity: Number(row.stockQuantity),
      isActive: Boolean(row.isActive),
    }));
  },

  async findVariantStockItem(variantId: number, exec?: Executor): Promise<StockItemRow | null> {
    const r = await query<StockItemRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, v.sku,
              v.stock_quantity AS stockQuantity, p.product_name AS productName,
              p.image_url AS imageUrl, p.is_active AS isActive,
              c.category_name AS categoryName, b.brand_name AS brandName,
              s.size_label AS sizeLabel, col.color_name AS colorName, col.hex_code AS hexCode
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors col ON col.color_id = v.color_id
       WHERE v.variant_id = @id AND v.is_deleted = 0 AND p.is_deleted = 0`,
      { id: [sql.Int, variantId] },
      exec,
    );
    const row = r.recordset[0];
    if (!row) return null;
    return {
      ...row,
      stockQuantity: Number(row.stockQuantity),
      isActive: Boolean(row.isActive),
    };
  },

  async listLedger(
    p: { variantId: number; from?: string; to?: string; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: LedgerEntryRow[]; total: number }> {
    const offset = (p.page - 1) * p.size;
    const fromDate = p.from ? new Date(`${p.from}T00:00:00.000Z`) : null;
    const toDate = p.to ? new Date(`${p.to}T23:59:59.999Z`) : null;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM inventory_transactions it
       WHERE it.variant_id = @vid
         AND (@from IS NULL OR it.created_at >= @from)
         AND (@to IS NULL OR it.created_at <= @to)`,
      {
        vid: [sql.Int, p.variantId],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    const rowsRes = await query<LedgerEntryRow>(
      `SELECT it.transaction_id AS transactionId, it.transaction_type AS transactionType,
              it.quantity_change AS quantityChange, it.stock_before AS stockBefore,
              it.stock_after AS stockAfter, it.reason, it.created_at AS createdAt,
              it.purchase_receipt_id AS purchaseReceiptId, it.invoice_id AS invoiceId,
              it.return_id AS returnId,
              COALESCE(u.username, N'Hệ thống') AS createdByName
       FROM inventory_transactions it
       LEFT JOIN users u ON u.user_id = it.created_by
       WHERE it.variant_id = @vid
         AND (@from IS NULL OR it.created_at >= @from)
         AND (@to IS NULL OR it.created_at <= @to)
       ORDER BY it.transaction_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        vid: [sql.Int, p.variantId],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
        offset: [sql.Int, offset],
        size: [sql.Int, p.size],
      },
      exec,
    );

    return {
      rows: rowsRes.recordset.map((r) => ({
        ...r,
        quantityChange: Number(r.quantityChange),
        stockBefore: Number(r.stockBefore),
        stockAfter: Number(r.stockAfter),
      })),
      total: countRes.recordset[0]?.total ?? 0,
    };
  },

  async adjustStock(
    variantId: number,
    quantityChange: number,
    reason: string,
    userId: number,
    exec?: Executor,
  ): Promise<void> {
    await query(
      `EXEC dbo.sp_adjust_stock @variant_id = @vid, @quantity_change = @qty, @reason = @reason, @user_id = @uid`,
      {
        vid: [sql.Int, variantId],
        qty: [sql.Int, quantityChange],
        reason: [sql.NVarChar(255), reason],
        uid: [sql.Int, userId],
      },
      exec,
    );
  },
};
