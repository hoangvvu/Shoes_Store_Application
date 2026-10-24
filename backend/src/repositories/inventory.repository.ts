import { query, sql, type Executor, type Param } from '../config/database';
import { searchPattern, unaccent } from '../utils/search';
import type { StockItemRow, LedgerEntryRow } from '../types/inventory.types';

export const inventoryRepository = {
  /** Lấy danh sách tồn kho kèm tìm kiếm và lọc hàng sắp hết */
  async listStock(f: {
    q?: string;
    lowStockOnly?: boolean;
    threshold?: number;
    page: number;
    size: number;
  }): Promise<{ rows: StockItemRow[]; total: number }> {
    const threshold = f.threshold ?? 5;
    const params: Record<string, Param> = {
      pattern: [sql.NVarChar(210), f.q ? searchPattern(f.q) : null],
      threshold: [sql.Int, threshold],
    };

    const where = `v.is_deleted = 0 AND p.is_deleted = 0
      AND (@pattern IS NULL OR ${unaccent('p.product_name')} LIKE @pattern ESCAPE '\\' OR ${unaccent('v.sku')} LIKE @pattern ESCAPE '\\')
      AND (@lowStockOnly = 0 OR v.stock_quantity <= @threshold)`;

    const countQuery = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
       AND (@pattern IS NULL OR ${unaccent('p.product_name')} LIKE @pattern ESCAPE '\\' OR ${unaccent('v.sku')} LIKE @pattern ESCAPE '\\')
       AND (${f.lowStockOnly ? '1' : '0'} = 0 OR v.stock_quantity <= @threshold)`,
      params,
    );

    const rowsQuery = await query<StockItemRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, v.sku, v.stock_quantity AS stockQuantity,
              p.product_name AS productName, p.image_url AS imageUrl, p.is_active AS isActive,
              cat.category_name AS categoryName, b.brand_name AS brandName,
              sz.size_label AS sizeLabel, c.color_name AS colorName, c.hex_code AS hexCode
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories cat ON cat.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes sz ON sz.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE ${where}
       ORDER BY v.variant_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        ...params,
        lowStockOnly: [sql.Bit, f.lowStockOnly ? 1 : 0],
        offset: [sql.Int, (f.page - 1) * f.size],
        size: [sql.Int, f.size],
      },
    );

    return {
      rows: rowsQuery.recordset.map((r: StockItemRow) => ({
        ...r,
        stockQuantity: Number(r.stockQuantity),
        isActive: Boolean(r.isActive),
      })),
      total: countQuery.recordset[0]?.total ?? 0,
    };
  },

  /** Lấy danh sách biến thể sắp hết hàng */
  async listLowStock(threshold = 5): Promise<StockItemRow[]> {
    const r = await query<StockItemRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, v.sku, v.stock_quantity AS stockQuantity,
              p.product_name AS productName, p.image_url AS imageUrl, p.is_active AS isActive,
              cat.category_name AS categoryName, b.brand_name AS brandName,
              sz.size_label AS sizeLabel, c.color_name AS colorName, c.hex_code AS hexCode
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories cat ON cat.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes sz ON sz.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0 AND v.stock_quantity <= @threshold
       ORDER BY v.stock_quantity ASC`,
      { threshold: [sql.Int, threshold] },
    );
    return r.recordset.map((row: StockItemRow) => ({
      ...row,
      stockQuantity: Number(row.stockQuantity),
      isActive: Boolean(row.isActive),
    }));
  },

  /** Tìm thông tin chi tiết tồn kho của 1 biến thể */
  async findVariantStockItem(variantId: number): Promise<StockItemRow | null> {
    const r = await query<StockItemRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, v.sku, v.stock_quantity AS stockQuantity,
              p.product_name AS productName, p.image_url AS imageUrl, p.is_active AS isActive,
              cat.category_name AS categoryName, b.brand_name AS brandName,
              sz.size_label AS sizeLabel, c.color_name AS colorName, c.hex_code AS hexCode
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       LEFT JOIN categories cat ON cat.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       JOIN sizes sz ON sz.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.variant_id = @variantId AND v.is_deleted = 0`,
      { variantId: [sql.Int, variantId] },
    );
    const row = r.recordset[0];
    if (!row) return null;
    return {
      ...row,
      stockQuantity: Number(row.stockQuantity),
      isActive: Boolean(row.isActive),
    };
  },

  /** Lấy lịch sử giao dịch kho (Ledger) */
  async listLedger(f: {
    variantId: number;
    from?: Date;
    to?: Date;
    page: number;
    size: number;
  }): Promise<{ rows: LedgerEntryRow[]; total: number }> {
    const params: Record<string, Param> = {
      variantId: [sql.Int, f.variantId],
      fromUtc: [sql.DateTime2(3), f.from ?? null],
      toUtc: [sql.DateTime2(3), f.to ?? null],
    };

    const where = `l.variant_id = @variantId
      AND (@fromUtc IS NULL OR l.created_at >= @fromUtc)
      AND (@toUtc IS NULL OR l.created_at < @toUtc)`;

    const countQuery = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM stock_ledger l WHERE ${where}`,
      params,
    );

    const rowsQuery = await query<LedgerEntryRow>(
      `SELECT l.transaction_id AS transactionId, l.transaction_type AS transactionType,
              l.quantity_change AS quantityChange, l.stock_before AS stockBefore, l.stock_after AS stockAfter,
              l.reason, l.created_at AS createdAt, l.purchase_receipt_id AS purchaseReceiptId,
              l.invoice_id AS invoiceId, l.return_id AS returnId,
              COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))), N''), u.username) AS createdByName
       FROM stock_ledger l
       LEFT JOIN users u ON u.user_id = l.created_by
       LEFT JOIN employees e ON e.employee_id = u.employee_id
       WHERE ${where}
       ORDER BY l.transaction_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        ...params,
        offset: [sql.Int, (f.page - 1) * f.size],
        size: [sql.Int, f.size],
      },
    );

    return {
      rows: rowsQuery.recordset.map((r: LedgerEntryRow) => ({
        ...r,
        quantityChange: Number(r.quantityChange),
        stockBefore: Number(r.stockBefore),
        stockAfter: Number(r.stockAfter),
        createdAt: new Date(r.createdAt),
      })),
      total: countQuery.recordset[0]?.total ?? 0,
    };
  },

  /** Điều chỉnh kho thủ công */
  async adjustStock(
    variantId: number,
    quantityChange: number,
    reason: string | null,
    userId: number,
    exec?: Executor,
  ): Promise<void> {
    const req = new sql.Request((exec as sql.Transaction) ?? undefined);
    req.input('variant_id', sql.Int, variantId);
    req.input('quantity_change', sql.Int, quantityChange);
    req.input('reason', sql.NVarChar(500), reason);
    req.input('user_id', sql.Int, userId);
    await req.execute('dbo.sp_adjust_stock');
  },
};