import { query, sql, type Executor, type Param } from '../config/database';
import { searchPattern, unaccent } from '../utils/search';
import type { PosVariantRow, PosProductRow, PaymentMethodOption } from '../types/pos.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { PosVariantRow, PosProductRow, PaymentMethodOption } from '../types/pos.types';

/** Truy vấn riêng cho màn Bán tại quầy (POS): tìm sản phẩm + biến thể còn kinh doanh, danh sách phương thức thu tiền. */
export const posRepository = {
  async searchProducts(
    f: { q?: string; inStock?: boolean; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: PosProductRow[]; total: number }> {
    const params: Record<string, Param> = {
      pattern: [sql.NVarChar(210), f.q ? searchPattern(f.q) : null],
      inStock: [sql.Bit, f.inStock ? 1 : 0],
    };
    // Sản phẩm còn bán, có ít nhất 1 biến thể chưa xóa; khớp tên sản phẩm, hãng, danh mục hoặc SKU của một biến thể
    const where = `p.is_deleted = 0 AND p.is_active = 1
      AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.product_id AND v.is_deleted = 0
                  AND (@inStock = 0 OR v.stock_quantity > 0))
      AND (@pattern IS NULL
           OR ${unaccent('p.product_name')} LIKE @pattern ESCAPE '\\'
           OR ${unaccent('b.brand_name')} LIKE @pattern ESCAPE '\\'
           OR ${unaccent('cat.category_name')} LIKE @pattern ESCAPE '\\'
           OR EXISTS (SELECT 1 FROM product_variants vs WHERE vs.product_id = p.product_id AND vs.is_deleted = 0
                      AND vs.sku COLLATE Latin1_General_100_CI_AI LIKE @pattern ESCAPE '\\'))`;
    const from = `FROM products p
      LEFT JOIN brands b ON b.brand_id = p.brand_id AND b.is_deleted = 0
      LEFT JOIN categories cat ON cat.category_id = p.category_id AND cat.is_deleted = 0`;

    const count = await query<{ total: number }>(`SELECT COUNT(*) AS total ${from} WHERE ${where}`, params, exec);
    const rows = await query<PosProductRow>(
      `SELECT p.product_id AS productId, p.product_name AS productName, p.image_url AS imageUrl,
              p.current_price AS unitPrice, cat.category_name AS categoryName, b.brand_name AS brandName
       ${from} WHERE ${where}
       ORDER BY p.product_name, p.product_id OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { ...params, offset: [sql.Int, (f.page - 1) * f.size], size: [sql.Int, f.size] },
      exec,
    );
    return {
      rows: rows.recordset.map((r) => ({ ...r, unitPrice: Number(r.unitPrice) })),
      total: count.recordset[0].total,
    };
  },

  /** Biến thể (size × màu) của các sản phẩm; productIds là số nguyên đã kiểm soát nên an toàn khi ghép vào IN (...). */
  async listVariants(productIds: number[], exec?: Executor): Promise<(PosVariantRow & { productId: number })[]> {
    if (!productIds.length) return [];
    const list = productIds.map((n) => Math.trunc(Number(n))).join(',');
    const r = await query<PosVariantRow & { productId: number }>(
      `SELECT v.product_id AS productId, v.variant_id AS variantId, v.sku, sz.size_label AS sizeLabel,
              c.color_name AS colorName, c.hex_code AS hexCode, v.stock_quantity AS stockQuantity
       FROM product_variants v
       JOIN sizes sz ON sz.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.is_deleted = 0 AND v.product_id IN (${list})
       ORDER BY v.product_id, c.color_name, sz.sort_order, sz.size_label`,
      {},
      exec,
    );
    return r.recordset;
  },

  async listPaymentMethods(exec?: Executor): Promise<PaymentMethodOption[]> {
    const r = await query<PaymentMethodOption>(
      `SELECT method_code AS methodCode, method_name AS methodName, is_online AS isOnline
       FROM payment_methods WHERE is_active = 1 AND is_deleted = 0 ORDER BY method_id`,
      {},
      exec,
    );
    return r.recordset;
  },
};
