const { query } = require('../config/database');
const { mapRowsToCamel } = require('../utils/mapper.util');

const reportRepository = {
  /**
   * 1. Revenue report by day or month
   */
  async getRevenue({ from, to, groupBy = 'day' }) {
    // Group format for date
    const dateGrouping =
      groupBy === 'month'
        ? `FORMAT(CAST(i.invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time' AS DATE), 'yyyy-MM')`
        : `CAST(i.invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time' AS DATE)`;

    const grossSql = `
      SELECT 
        ${dateGrouping} AS period,
        COUNT(*) AS total_orders,
        ISNULL(SUM(i.total_amount), 0) AS gross_total,
        ISNULL(SUM(i.discount_amount), 0) AS total_discount,
        ISNULL(SUM(i.amount_payable), 0) AS gross_revenue
      FROM invoices i
      WHERE i.order_status = 'DELIVERED' AND i.is_deleted = 0
        AND (@from IS NULL OR i.invoice_date >= @from)
        AND (@to IS NULL OR i.invoice_date < @to)
      GROUP BY ${dateGrouping}
      ORDER BY period ASC;
    `;

    const refundDateGrouping =
      groupBy === 'month'
        ? `FORMAT(CAST(rf.completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time' AS DATE), 'yyyy-MM')`
        : `CAST(rf.completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time' AS DATE)`;

    const refundSql = `
      SELECT 
        ${refundDateGrouping} AS period,
        ISNULL(SUM(rf.amount), 0) AS total_refunded
      FROM refunds rf
      WHERE rf.status = 'SUCCESS' AND rf.is_deleted = 0
        AND (@from IS NULL OR rf.completed_at >= @from)
        AND (@to IS NULL OR rf.completed_at < @to)
      GROUP BY ${refundDateGrouping};
    `;

    const grossRes = await query(grossSql, { from: from || null, to: to || null });
    const refundRes = await query(refundSql, { from: from || null, to: to || null });

    const refundMap = new Map();
    for (const r of refundRes.recordset) {
      refundMap.set(String(r.period), Number(r.total_refunded));
    }

    const items = grossRes.recordset.map((row) => {
      const periodStr = String(row.period);
      const refunded = refundMap.get(periodStr) || 0;
      const gross = Number(row.gross_revenue);
      return {
        period: periodStr,
        totalOrders: row.total_orders,
        grossTotal: Number(row.gross_total),
        totalDiscount: Number(row.total_discount),
        grossRevenue: gross,
        totalRefunded: refunded,
        netRevenue: gross - refunded,
      };
    });

    return items;
  },

  /**
   * 2. Top selling products
   */
  async getTopProducts({ from = null, to = null, limit = 10 }) {
    const sqlText = `
      SELECT TOP (@limit)
        p.product_id,
        p.product_name,
        p.image_url,
        c.category_name,
        b.brand_name,
        p.current_price,
        ISNULL(SUM(d.quantity), 0) AS total_sold_quantity,
        ISNULL(SUM(d.line_total), 0) AS total_sales_amount
      FROM invoice_details d
      JOIN invoices i ON i.invoice_id = d.invoice_id
        AND i.order_status = 'DELIVERED' AND i.is_deleted = 0
      JOIN product_variants v ON v.variant_id = d.variant_id
      JOIN products p ON p.product_id = v.product_id
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN brands b ON b.brand_id = p.brand_id
      WHERE (@from IS NULL OR i.invoice_date >= @from)
        AND (@to IS NULL OR i.invoice_date < @to)
      GROUP BY p.product_id, p.product_name, p.image_url, c.category_name, b.brand_name, p.current_price
      ORDER BY total_sold_quantity DESC;
    `;
    const res = await query(sqlText, { from: from || null, to: to || null, limit: parseInt(limit, 10) });
    return mapRowsToCamel(res.recordset);
  },

  /**
   * 3. Orders by status and overdue pending orders
   */
  async getOrderSummary({ from = null, to = null }) {
    const statusSql = `
      SELECT 
        order_status,
        COUNT(*) AS count,
        ISNULL(SUM(amount_payable), 0) AS total_amount
      FROM invoices
      WHERE is_deleted = 0
        AND (@from IS NULL OR invoice_date >= @from)
        AND (@to IS NULL OR invoice_date < @to)
      GROUP BY order_status;
    `;

    const overdueSql = `
      SELECT COUNT(*) AS overdue_pending_count
      FROM invoices
      WHERE order_status = 'PENDING' AND is_deleted = 0
        AND invoice_date < DATEADD(hour, -24, SYSUTCDATETIME());
    `;

    const statusRes = await query(statusSql, { from: from || null, to: to || null });
    const overdueRes = await query(overdueSql);

    return {
      byStatus: mapRowsToCamel(statusRes.recordset),
      overduePendingCount: overdueRes.recordset[0].overdue_pending_count,
    };
  },

  /**
   * 4. Low stock and stale stock report
   */
  async getStockAlerts({ threshold = 10, staleDays = 30 }) {
    const lowStockSql = `
      SELECT v.variant_id, v.sku, v.stock_quantity,
             p.product_id, p.product_name, sz.size_label, cl.color_name
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      WHERE v.is_deleted = 0 AND p.is_deleted = 0 AND p.is_active = 1
        AND v.stock_quantity <= @threshold
      ORDER BY v.stock_quantity ASC;
    `;

    const staleStockSql = `
      SELECT v.variant_id, v.sku, v.stock_quantity,
             p.product_id, p.product_name, sz.size_label, cl.color_name,
             MAX(tx.created_at) AS last_movement_date,
             DATEDIFF(day, ISNULL(MAX(tx.created_at), p.created_at), SYSUTCDATETIME()) AS days_inactive
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      LEFT JOIN inventory_transactions tx ON tx.variant_id = v.variant_id
      WHERE v.is_deleted = 0 AND p.is_deleted = 0 AND v.stock_quantity > 0
      GROUP BY v.variant_id, v.sku, v.stock_quantity, p.product_id, p.product_name, sz.size_label, cl.color_name, p.created_at
      HAVING DATEDIFF(day, ISNULL(MAX(tx.created_at), p.created_at), SYSUTCDATETIME()) >= @staleDays
      ORDER BY days_inactive DESC;
    `;

    const lowStockRes = await query(lowStockSql, { threshold: parseInt(threshold, 10) });
    const staleRes = await query(staleStockSql, { staleDays: parseInt(staleDays, 10) });

    return {
      lowStock: mapRowsToCamel(lowStockRes.recordset),
      staleStock: mapRowsToCamel(staleRes.recordset),
    };
  },

  /**
   * 6. Top customers by total purchased amount
   */
  async getTopCustomers({ limit = 10 }) {
    const sqlText = `
      SELECT TOP (@limit)
        c.customer_id,
        c.full_name,
        c.phone,
        c.total_purchased,
        COUNT(i.invoice_id) AS total_delivered_orders
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.customer_id
        AND i.order_status = 'DELIVERED' AND i.is_deleted = 0
      WHERE c.is_deleted = 0
      GROUP BY c.customer_id, c.full_name, c.phone, c.total_purchased
      ORDER BY c.total_purchased DESC;
    `;
    const res = await query(sqlText, { limit: parseInt(limit, 10) });
    return mapRowsToCamel(res.recordset);
  },

  /**
   * 7. Employee performance summary
   */
  async getEmployeeSales({ from = null, to = null }) {
    const sqlText = `
      SELECT 
        e.employee_id,
        e.full_name,
        e.phone,
        e.base_salary,
        COUNT(i.invoice_id) AS total_orders,
        ISNULL(SUM(i.amount_payable), 0) AS total_revenue
      FROM employees e
      LEFT JOIN invoices i ON i.employee_id = e.employee_id
        AND i.order_status = 'DELIVERED' AND i.is_deleted = 0
        AND (@from IS NULL OR i.invoice_date >= @from)
        AND (@to IS NULL OR i.invoice_date < @to)
      WHERE e.is_deleted = 0
      GROUP BY e.employee_id, e.full_name, e.phone, e.base_salary
      ORDER BY total_revenue DESC;
    `;
    const res = await query(sqlText, { from: from || null, to: to || null });
    return mapRowsToCamel(res.recordset);
  },

  /**
   * 8. Return rate by product
   */
  async getReturnRates({ from = null, to = null }) {
    const sqlText = `
      SELECT 
        p.product_id,
        p.product_name,
        ISNULL(sold.total_sold, 0) AS total_sold,
        ISNULL(ret.total_returned, 0) AS total_returned,
        CASE 
          WHEN ISNULL(sold.total_sold, 0) = 0 THEN 0
          ELSE CAST(ISNULL(ret.total_returned, 0) * 100.0 / sold.total_sold AS DECIMAL(5,2))
        END AS return_rate_percent
      FROM products p
      OUTER APPLY (
        SELECT SUM(d.quantity) AS total_sold
        FROM invoice_details d
        JOIN invoices i ON i.invoice_id = d.invoice_id
        JOIN product_variants v ON v.variant_id = d.variant_id
        WHERE v.product_id = p.product_id
          AND i.order_status = 'DELIVERED' AND i.is_deleted = 0
          AND (@from IS NULL OR i.invoice_date >= @from)
          AND (@to IS NULL OR i.invoice_date < @to)
      ) sold
      OUTER APPLY (
        SELECT SUM(ri.quantity) AS total_returned
        FROM return_items ri
        JOIN [returns] r ON r.return_id = ri.return_id
        JOIN product_variants v ON v.variant_id = ri.variant_id
        WHERE v.product_id = p.product_id
          AND r.status = 'RECEIVED' AND r.is_deleted = 0
          AND (@from IS NULL OR r.requested_at >= @from)
          AND (@to IS NULL OR r.requested_at < @to)
      ) ret
      WHERE p.is_deleted = 0 AND (sold.total_sold > 0 OR ret.total_returned > 0)
      ORDER BY return_rate_percent DESC, total_returned DESC;
    `;
    const res = await query(sqlText, { from: from || null, to: to || null });
    return mapRowsToCamel(res.recordset);
  },
};

module.exports = reportRepository;
