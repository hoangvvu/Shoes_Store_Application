import { query, sql, type Executor } from '../config/database';
import type { RevenuePointRow, TopProductRow, OrdersReportRow, StockAlertRow, InventoryMovementRow, TopCustomerRow, EmployeeSalesRow, ReturnRateRow } from '../types/report.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { RevenuePointRow, TopProductRow, OrdersReportRow, StockAlertRow, InventoryMovementRow, TopCustomerRow, EmployeeSalesRow, ReturnRateRow } from '../types/report.types';

const CUSTOMER_NAME = `LTRIM(RTRIM(CONCAT(c.last_name, N' ', c.first_name)))`;
const EMPLOYEE_NAME = `LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name)))`;

export const reportRepository = {
  async getRevenue(
    from: string,
    to: string,
    groupBy: 'day' | 'month',
    exec?: Executor,
  ): Promise<RevenuePointRow[]> {
    const fmt = groupBy === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd';
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const invoiceRes = await query<{ period: string; orders: number; grossRevenue: number }>(
      `SELECT
         FORMAT(i.invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time', @fmt) AS period,
         COUNT(*) AS orders,
         ISNULL(SUM(i.amount_payable), 0) AS grossRevenue
       FROM invoices i
       WHERE i.order_status = 'DELIVERED' AND i.is_deleted = 0
         AND i.invoice_date >= @from AND i.invoice_date <= @to
       GROUP BY FORMAT(i.invoice_date AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time', @fmt)
       ORDER BY period ASC`,
      {
        fmt: [sql.VarChar(10), fmt],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    const refundRes = await query<{ period: string; refunded: number }>(
      `SELECT
         FORMAT(r.completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time', @fmt) AS period,
         ISNULL(SUM(r.amount), 0) AS refunded
       FROM refunds r
       WHERE r.status = 'SUCCESS' AND r.is_deleted = 0
         AND r.completed_at >= @from AND r.completed_at <= @to
       GROUP BY FORMAT(r.completed_at AT TIME ZONE 'UTC' AT TIME ZONE 'SE Asia Standard Time', @fmt)`,
      {
        fmt: [sql.VarChar(10), fmt],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    const refundMap = new Map(refundRes.recordset.map((r) => [r.period, Number(r.refunded)]));
    const allPeriods = new Set([
      ...invoiceRes.recordset.map((r) => r.period),
      ...refundRes.recordset.map((r) => r.period),
    ]);

    const sortedPeriods = Array.from(allPeriods).sort();
    const invMap = new Map(invoiceRes.recordset.map((r) => [r.period, r]));

    return sortedPeriods.map((period) => {
      const inv = invMap.get(period);
      const orders = inv ? Number(inv.orders) : 0;
      const grossRevenue = inv ? Number(inv.grossRevenue) : 0;
      const refunded = refundMap.get(period) ?? 0;
      return {
        period,
        orders,
        grossRevenue,
        refunded,
        netRevenue: grossRevenue - refunded,
      };
    });
  },

  async getTopProducts(
    from: string,
    to: string,
    limit = 10,
    by: 'quantity' | 'revenue' = 'quantity',
    exec?: Executor,
  ): Promise<TopProductRow[]> {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);
    const orderBy = by === 'revenue' ? 'revenue DESC' : 'quantity DESC';

    const r = await query<TopProductRow>(
      `SELECT TOP (@limit)
         p.product_id AS productId,
         p.product_name AS productName,
         p.image_url AS imageUrl,
         ISNULL(SUM(d.quantity), 0) AS quantity,
         ISNULL(SUM(d.line_total), 0) AS revenue
       FROM invoice_details d
       JOIN invoices i ON i.invoice_id = d.invoice_id
       JOIN product_variants v ON v.variant_id = d.variant_id
       JOIN products p ON p.product_id = v.product_id
       WHERE i.order_status = 'DELIVERED' AND i.is_deleted = 0
         AND i.invoice_date >= @from AND i.invoice_date <= @to
       GROUP BY p.product_id, p.product_name, p.image_url
       ORDER BY ${orderBy}`,
      {
        limit: [sql.Int, limit],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    return r.recordset.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    }));
  },

  async getOrdersReport(from: string, to: string, exec?: Executor): Promise<OrdersReportRow> {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const statusRes = await query<{ status: string; count: number }>(
      `SELECT order_status AS status, COUNT(*) AS count
       FROM invoices
       WHERE is_deleted = 0
         AND invoice_date >= @from AND invoice_date <= @to
       GROUP BY order_status`,
      {
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    const overdueRes = await query<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM invoices
       WHERE order_status = 'PENDING' AND is_deleted = 0
         AND invoice_date < DATEADD(HOUR, -24, SYSUTCDATETIME())`,
      {},
      exec,
    );

    return {
      byStatus: statusRes.recordset.map((s) => ({ status: s.status, count: Number(s.count) })),
      overduePending: Number(overdueRes.recordset[0]?.count ?? 0),
    };
  },

  async getStockReport(
    threshold = 5,
    staleDays = 30,
    exec?: Executor,
  ): Promise<{ lowStock: StockAlertRow[]; staleStock: StockAlertRow[] }> {
    const lowRes = await query<StockAlertRow>(
      `SELECT v.variant_id AS variantId, v.sku, p.product_name AS productName,
              s.size_label AS sizeLabel, c.color_name AS colorName,
              v.stock_quantity AS stockQuantity,
              (SELECT MAX(created_at) FROM inventory_transactions WHERE variant_id = v.variant_id) AS lastMovementAt
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
         AND v.stock_quantity <= @threshold
       ORDER BY v.stock_quantity ASC`,
      { threshold: [sql.Int, threshold] },
      exec,
    );

    const staleRes = await query<StockAlertRow>(
      `SELECT v.variant_id AS variantId, v.sku, p.product_name AS productName,
              s.size_label AS sizeLabel, c.color_name AS colorName,
              v.stock_quantity AS stockQuantity,
              m.lastMovementAt
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       OUTER APPLY (
         SELECT MAX(created_at) AS lastMovementAt
         FROM inventory_transactions WHERE variant_id = v.variant_id
       ) m
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
         AND v.stock_quantity > 0
         AND (m.lastMovementAt IS NULL OR m.lastMovementAt < DATEADD(DAY, -@staleDays, SYSUTCDATETIME()))
       ORDER BY m.lastMovementAt ASC, v.stock_quantity DESC`,
      { staleDays: [sql.Int, staleDays] },
      exec,
    );

    const mapStock = (r: StockAlertRow) => ({
      ...r,
      stockQuantity: Number(r.stockQuantity),
      lastMovementAt: r.lastMovementAt,
    });

    return {
      lowStock: lowRes.recordset.map(mapStock),
      staleStock: staleRes.recordset.map(mapStock),
    };
  },

  async getInventoryMovement(
    from: string,
    to: string,
    exec?: Executor,
  ): Promise<InventoryMovementRow[]> {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const r = await query<InventoryMovementRow>(
      `SELECT v.variant_id AS variantId, v.sku, p.product_name AS productName,
              s.size_label AS sizeLabel, c.color_name AS colorName,
              ISNULL(SUM(CASE WHEN it.created_at < @from THEN it.quantity_change ELSE 0 END), 0) AS openingStock,
              ISNULL(SUM(CASE WHEN it.created_at >= @from AND it.created_at <= @to AND it.quantity_change > 0 THEN it.quantity_change ELSE 0 END), 0) AS imported,
              ISNULL(SUM(CASE WHEN it.created_at >= @from AND it.created_at <= @to AND it.quantity_change < 0 THEN -it.quantity_change ELSE 0 END), 0) AS exported,
              ISNULL(SUM(CASE WHEN it.created_at <= @to THEN it.quantity_change ELSE 0 END), 0) AS closingStock
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       LEFT JOIN inventory_transactions it ON it.variant_id = v.variant_id
       WHERE v.is_deleted = 0 AND p.is_deleted = 0
       GROUP BY v.variant_id, v.sku, p.product_name, s.size_label, c.color_name
       ORDER BY v.variant_id ASC`,
      {
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    return r.recordset.map((row) => ({
      ...row,
      openingStock: Number(row.openingStock),
      imported: Number(row.imported),
      exported: Number(row.exported),
      closingStock: Number(row.closingStock),
    }));
  },

  async getTopCustomers(
    from: string,
    to: string,
    limit = 10,
    exec?: Executor,
  ): Promise<TopCustomerRow[]> {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const r = await query<TopCustomerRow>(
      `SELECT TOP (@limit)
         c.customer_id AS customerId,
         ${CUSTOMER_NAME} AS fullName,
         c.phone,
         COUNT(i.invoice_id) AS orders,
         ISNULL(SUM(i.amount_payable), 0) AS totalPurchased
       FROM customers c
       JOIN invoices i ON i.customer_id = c.customer_id
       WHERE i.order_status = 'DELIVERED' AND i.is_deleted = 0
         AND i.invoice_date >= @from AND i.invoice_date <= @to
       GROUP BY c.customer_id, c.last_name, c.first_name, c.phone
       ORDER BY totalPurchased DESC`,
      {
        limit: [sql.Int, limit],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    return r.recordset.map((row) => ({
      ...row,
      orders: Number(row.orders),
      totalPurchased: Number(row.totalPurchased),
    }));
  },

  async getEmployeeSales(
    from: string,
    to: string,
    exec?: Executor,
  ): Promise<EmployeeSalesRow[]> {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const r = await query<EmployeeSalesRow>(
      `SELECT
         e.employee_id AS employeeId,
         ${EMPLOYEE_NAME} AS fullName,
         COUNT(i.invoice_id) AS orders,
         ISNULL(SUM(i.amount_payable), 0) AS revenue
       FROM employees e
       JOIN invoices i ON i.employee_id = e.employee_id
       WHERE i.order_status = 'DELIVERED' AND i.is_deleted = 0
         AND i.invoice_date >= @from AND i.invoice_date <= @to
       GROUP BY e.employee_id, e.last_name, e.first_name
       ORDER BY revenue DESC`,
      {
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    return r.recordset.map((row) => ({
      ...row,
      orders: Number(row.orders),
      revenue: Number(row.revenue),
    }));
  },

  async getReturns(
    from: string,
    to: string,
    exec?: Executor,
  ): Promise<ReturnRateRow[]> {
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const r = await query<ReturnRateRow>(
      `SELECT
         p.product_id AS productId,
         p.product_name AS productName,
         ISNULL(s.soldQuantity, 0) AS soldQuantity,
         ISNULL(r.returnedQuantity, 0) AS returnedQuantity,
         ISNULL(r.returnedValue, 0) AS returnedValue
       FROM products p
       OUTER APPLY (
         SELECT SUM(d.quantity) AS soldQuantity
         FROM invoice_details d
         JOIN invoices i ON i.invoice_id = d.invoice_id
         JOIN product_variants v ON v.variant_id = d.variant_id
         WHERE v.product_id = p.product_id AND i.order_status = 'DELIVERED' AND i.is_deleted = 0
           AND i.invoice_date >= @from AND i.invoice_date <= @to
       ) s
       OUTER APPLY (
         SELECT SUM(ri.quantity) AS returnedQuantity,
                SUM(ri.quantity * d.sale_price) AS returnedValue
         FROM return_items ri
         JOIN [returns] ret ON ret.return_id = ri.return_id
         JOIN product_variants v ON v.variant_id = ri.variant_id
         JOIN invoice_details d ON d.invoice_id = ret.invoice_id AND d.variant_id = ri.variant_id
         WHERE v.product_id = p.product_id AND ret.status = 'RECEIVED' AND ret.is_deleted = 0
           AND ret.requested_at >= @from AND ret.requested_at <= @to
       ) r
       WHERE p.is_deleted = 0 AND (s.soldQuantity > 0 OR r.returnedQuantity > 0)
       ORDER BY returnedQuantity DESC, soldQuantity DESC`,
      {
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    return r.recordset.map((row) => {
      const soldQuantity = Number(row.soldQuantity);
      const returnedQuantity = Number(row.returnedQuantity);
      const returnedValue = Number(row.returnedValue);
      const ratePercent = soldQuantity > 0 ? Math.round((returnedQuantity / soldQuantity) * 1000) / 10 : 0;
      return {
        ...row,
        soldQuantity,
        returnedQuantity,
        returnedValue,
        ratePercent,
      };
    });
  },
};
