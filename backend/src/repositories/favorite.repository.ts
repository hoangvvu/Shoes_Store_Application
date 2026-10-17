import { query, sql, type Executor } from '../config/database';

export interface FavoriteRow {
  productId: number;
  productName: string;
  imageUrl: string | null;
  currentPrice: number;
  favoritedAt: Date;
}

export const favoriteRepository = {
  async productExists(productId: number, exec?: Executor): Promise<boolean> {
    const r = await query(`SELECT 1 AS x FROM products WHERE product_id = @id AND is_deleted = 0`, { id: [sql.Int, productId] }, exec);
    return r.recordset.length > 0;
  },

  /** "Khôi phục nếu có, thêm nếu chưa": thích lại một sản phẩm đã bỏ thích sẽ dùng lại dòng cũ. */
  async like(customerId: number, productId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE favorite_products SET is_deleted = 0, deleted_at = NULL WHERE customer_id = @c AND product_id = @p;
       IF @@ROWCOUNT = 0 INSERT INTO favorite_products (customer_id, product_id) VALUES (@c, @p);`,
      { c: [sql.Int, customerId], p: [sql.Int, productId] },
      exec,
    );
  },

  /** Bỏ thích = xóa mềm. */
  async unlike(customerId: number, productId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE favorite_products SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE customer_id = @c AND product_id = @p AND is_deleted = 0`,
      { c: [sql.Int, customerId], p: [sql.Int, productId] },
      exec,
    );
  },

  /** Ẩn sản phẩm đã xóa hoặc ngừng kinh doanh. */
  async list(customerId: number, page: number, size: number, exec?: Executor) {
    const where = `f.customer_id = @c AND f.is_deleted = 0 AND p.is_deleted = 0 AND p.is_active = 1`;
    const count = await query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM favorite_products f JOIN products p ON p.product_id = f.product_id WHERE ${where}`,
      { c: [sql.Int, customerId] },
      exec,
    );
    const rows = await query<FavoriteRow>(
      `SELECT p.product_id AS productId, p.product_name AS productName, p.image_url AS imageUrl,
              p.current_price AS currentPrice, f.created_at AS favoritedAt
       FROM favorite_products f JOIN products p ON p.product_id = f.product_id
       WHERE ${where} ORDER BY f.created_at DESC, p.product_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { c: [sql.Int, customerId], offset: [sql.Int, (page - 1) * size], size: [sql.Int, size] },
      exec,
    );
    return { rows: rows.recordset.map((x) => ({ ...x, currentPrice: Number(x.currentPrice) })), total: count.recordset[0].total };
  },
};
