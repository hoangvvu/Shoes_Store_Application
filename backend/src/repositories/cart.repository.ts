import { query, sql, type Executor } from '../config/database';

export type Availability = 'OK' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK' | 'UNAVAILABLE';

export interface CartItemRow {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  stockQuantity: number;
  availability: Availability;
}

export const cartRepository = {
  async findActiveCartId(customerId: number, exec?: Executor): Promise<number | null> {
    const r = await query<{ cartId: number }>(
      `SELECT cart_id AS cartId FROM carts WHERE customer_id = @customerId AND status = 'ACTIVE' AND is_deleted = 0`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0]?.cartId ?? null;
  },

  /** uq_cart_active chặn 2 giỏ ACTIVE; service bắt lỗi trùng rồi thử lại 1 lần. */
  async createCart(customerId: number, exec?: Executor): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO carts (customer_id) VALUES (@customerId); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0].id;
  },

  /** Biến thể còn kinh doanh (chưa xóa, sản phẩm đang bán) mới được thêm vào giỏ. */
  async variantIsSellable(variantId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM product_variants v JOIN products p ON p.product_id = v.product_id
       WHERE v.variant_id = @variantId AND v.is_deleted = 0 AND p.is_deleted = 0 AND p.is_active = 1`,
      { variantId: [sql.Int, variantId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  /** "Cập nhật nếu có, chèn nếu chưa": cộng dồn; dòng từng xóa mềm thì khôi phục với số lượng mới. */
  async upsertItem(cartId: number, variantId: number, qty: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE cart_items
         SET quantity = CASE WHEN is_deleted = 1 THEN @qty ELSE quantity + @qty END,
             is_deleted = 0, deleted_at = NULL, updated_at = SYSUTCDATETIME()
       WHERE cart_id = @cartId AND variant_id = @variantId;
       IF @@ROWCOUNT = 0
         INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (@cartId, @variantId, @qty);`,
      { cartId: [sql.Int, cartId], variantId: [sql.Int, variantId], qty: [sql.Int, qty] },
      exec,
    );
  },

  /** Trả số dòng bị ảnh hưởng; 0 = dòng không có trong giỏ. */
  async setQuantity(cartId: number, variantId: number, qty: number, exec?: Executor): Promise<number> {
    const r = await query(
      `UPDATE cart_items SET quantity = @qty, updated_at = SYSUTCDATETIME()
       WHERE cart_id = @cartId AND variant_id = @variantId AND is_deleted = 0`,
      { cartId: [sql.Int, cartId], variantId: [sql.Int, variantId], qty: [sql.Int, qty] },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  async softDeleteItem(cartId: number, variantId: number, exec?: Executor): Promise<number> {
    const r = await query(
      `UPDATE cart_items SET is_deleted = 1, deleted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
       WHERE cart_id = @cartId AND variant_id = @variantId AND is_deleted = 0`,
      { cartId: [sql.Int, cartId], variantId: [sql.Int, variantId] },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  async softDeleteAll(cartId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE cart_items SET is_deleted = 1, deleted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
       WHERE cart_id = @cartId AND is_deleted = 0`,
      { cartId: [sql.Int, cartId] },
      exec,
    );
  },

  async softDeleteUnavailable(cartId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE ci SET is_deleted = 1, deleted_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
       FROM cart_items ci
       JOIN vw_cart_item_status s ON s.cart_id = ci.cart_id AND s.variant_id = ci.variant_id
       WHERE ci.cart_id = @cartId AND ci.is_deleted = 0 AND s.availability = 'UNAVAILABLE'`,
      { cartId: [sql.Int, cartId] },
      exec,
    );
  },

  async touch(cartId: number, exec?: Executor): Promise<void> {
    await query(`UPDATE carts SET updated_at = SYSUTCDATETIME() WHERE cart_id = @cartId`, { cartId: [sql.Int, cartId] }, exec);
  },

  /** Các dòng đang có + tình trạng từ view; giá luôn lấy lại từ products.current_price (không lưu giá trong giỏ). */
  async listItems(cartId: number, exec?: Executor): Promise<CartItemRow[]> {
    const r = await query<CartItemRow>(
      `SELECT s.variant_id AS variantId, p.product_id AS productId, p.product_name AS productName,
              p.image_url AS imageUrl, v.sku, sz.size_label AS sizeLabel, c.color_name AS colorName,
              s.quantity, s.current_price AS unitPrice, s.stock_quantity AS stockQuantity, s.availability
       FROM vw_cart_item_status s
       JOIN cart_items ci      ON ci.cart_id = s.cart_id AND ci.variant_id = s.variant_id
       JOIN product_variants v ON v.variant_id = s.variant_id
       JOIN products p         ON p.product_id = v.product_id
       JOIN sizes sz           ON sz.size_id = v.size_id
       JOIN colors c           ON c.color_id = v.color_id
       WHERE s.cart_id = @cartId
       ORDER BY ci.created_at DESC, s.variant_id`,
      { cartId: [sql.Int, cartId] },
      exec,
    );
    return r.recordset;
  },

  /** Dùng ở luồng đặt hàng (M8), trong cùng transaction tạo đơn: giỏ chuyển CHECKED_OUT. */
  async markCheckedOut(cartId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE carts SET status = 'CHECKED_OUT', updated_at = SYSUTCDATETIME() WHERE cart_id = @cartId AND status = 'ACTIVE'`,
      { cartId: [sql.Int, cartId] },
      exec,
    );
  },
};
