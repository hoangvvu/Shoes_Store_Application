const { query, sql } = require('../config/database');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/mapper.util');

const inventoryRepository = {
  /**
   * View current stock across variants with optional low stock filter
   */
  async getStockList({
    q = null,
    categoryId = null,
    brandId = null,
    threshold = null,
    lowStockOnly = false,
    page = 1,
    size = 15,
  }) {
    const offset = (page - 1) * size;
    let filterSql = 'WHERE v.is_deleted = 0 AND p.is_deleted = 0';

    if (q) {
      filterSql += ` AND (p.product_name COLLATE Vietnamese_CI_AI LIKE N'%' + @q + N'%' OR v.sku LIKE '%' + @q + '%')`;
    }
    if (categoryId) {
      filterSql += ' AND p.category_id = @categoryId';
    }
    if (brandId) {
      filterSql += ' AND p.brand_id = @brandId';
    }
    if (lowStockOnly || threshold !== null) {
      const th = threshold !== null ? threshold : 10;
      filterSql += ` AND v.stock_quantity <= ${parseInt(th, 10)}`;
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      ${filterSql}
    `;

    const selectSql = `
      SELECT v.variant_id, v.product_id, v.sku, v.stock_quantity,
             p.product_name, p.current_price, p.unit, p.image_url, p.is_active,
             c.category_name, b.brand_name,
             sz.size_label, cl.color_name, cl.hex_code
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN brands b ON b.brand_id = p.brand_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      ${filterSql}
      ORDER BY v.stock_quantity ASC, p.product_id DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const params = {
      q: q || null,
      categoryId: categoryId || null,
      brandId: brandId || null,
      offset,
      size,
    };

    const countRes = await query(countSql, params);
    const selectRes = await query(selectSql, params);

    const total = countRes.recordset[0].total;
    return {
      items: mapRowsToCamel(selectRes.recordset),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  /**
   * Get stock ledger (thẻ kho) for a specific variant
   */
  async getVariantLedger(variantId, { from = null, to = null, page = 1, size = 20 }) {
    const offset = (page - 1) * size;
    let filterSql = 'WHERE tx.variant_id = @variantId';

    if (from) {
      filterSql += ' AND tx.created_at >= @from';
    }
    if (to) {
      filterSql += ' AND tx.created_at < @to';
    }

    const countSql = `SELECT COUNT(*) AS total FROM inventory_transactions tx ${filterSql}`;

    const selectSql = `
      SELECT tx.transaction_id, tx.variant_id, tx.transaction_type, tx.quantity_change,
             tx.stock_before, tx.stock_after, tx.reason, tx.created_at,
             tx.purchase_receipt_id, tx.invoice_id, tx.return_id,
             u.user_id, u.username,
             v.sku, p.product_name, sz.size_label, cl.color_name
      FROM inventory_transactions tx
      JOIN product_variants v ON v.variant_id = tx.variant_id
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      LEFT JOIN users u ON u.user_id = tx.created_by
      ${filterSql}
      ORDER BY tx.transaction_id DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const params = {
      variantId,
      from: from || null,
      to: to || null,
      offset,
      size,
    };

    const countRes = await query(countSql, params);
    const selectRes = await query(selectSql, params);

    const total = countRes.recordset[0].total;
    return {
      items: mapRowsToCamel(selectRes.recordset),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  /**
   * Adjust stock manually via stored procedure sp_adjust_stock
   */
  async adjustStock(variantId, quantityChange, reason, userId) {
    const pool = await (require('../config/database').getPool());
    const req = pool.request();
    req.input('variant_id', sql.Int, variantId);
    req.input('quantity_change', sql.Int, quantityChange);
    req.input('reason', sql.NVarChar(255), reason);
    req.input('user_id', sql.Int, userId);

    await req.execute('dbo.sp_adjust_stock');

    // Retrieve updated variant
    const checkSql = `
      SELECT v.variant_id, v.sku, v.stock_quantity, p.product_name, sz.size_label, cl.color_name
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      WHERE v.variant_id = @variantId
    `;
    const res = await query(checkSql, { variantId });
    return mapRowToCamel(res.recordset[0]);
  },

  /**
   * Get low-stock variants list
   */
  async getLowStockVariants(threshold = 10) {
    const sqlText = `
      SELECT v.variant_id, v.sku, v.stock_quantity,
             p.product_id, p.product_name, p.current_price, p.image_url,
             c.category_name, b.brand_name,
             sz.size_label, cl.color_name
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN brands b ON b.brand_id = p.brand_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      WHERE v.is_deleted = 0 AND p.is_deleted = 0
        AND v.stock_quantity <= @threshold
      ORDER BY v.stock_quantity ASC, p.product_id DESC;
    `;
    const res = await query(sqlText, { threshold });
    return mapRowsToCamel(res.recordset);
  },

  /**
   * Inventory movement report (Nhập - Xuất - Tồn)
   */
  async getInventoryMovement(fromDate, toDate) {
    const sqlText = `
      SELECT 
        v.variant_id,
        v.sku,
        p.product_name,
        sz.size_label,
        cl.color_name,
        ISNULL(SUM(CASE WHEN tx.created_at < @fromDate THEN tx.quantity_change ELSE 0 END), 0) AS ton_dau,
        ISNULL(SUM(CASE WHEN tx.created_at >= @fromDate AND tx.created_at < @toDate AND tx.quantity_change > 0 THEN tx.quantity_change ELSE 0 END), 0) AS nhap,
        ISNULL(SUM(CASE WHEN tx.created_at >= @fromDate AND tx.created_at < @toDate AND tx.quantity_change < 0 THEN -tx.quantity_change ELSE 0 END), 0) AS xuat,
        ISNULL(SUM(CASE WHEN tx.created_at < @toDate THEN tx.quantity_change ELSE 0 END), 0) AS ton_cuoi
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      LEFT JOIN inventory_transactions tx ON tx.variant_id = v.variant_id
      WHERE v.is_deleted = 0 AND p.is_deleted = 0
      GROUP BY v.variant_id, v.sku, p.product_name, sz.size_label, cl.color_name
      ORDER BY p.product_name ASC, sz.size_label ASC;
    `;
    const res = await query(sqlText, { fromDate, toDate });
    return mapRowsToCamel(res.recordset);
  },
};

module.exports = inventoryRepository;
