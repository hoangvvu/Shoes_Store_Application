import { query, sql, type Executor } from '../config/database';

export interface ReceiptListItemRow {
  receiptId: number;
  receiptDate: Date;
  totalAmount: number;
  supplierId: number;
  supplierName: string;
  employeeId: number;
  employeeName: string;
  itemCount: number;
  totalQuantity: number;
  isDeleted: boolean;
}

export interface ReceiptDetailRow extends ReceiptListItemRow {
  supplierPhone: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
}

export interface ReceiptLineRow {
  variantId: number;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
  unit: string;
  quantity: number;
  importPrice: number;
  lineTotal: number;
}

export const receiptRepository = {
  async list(
    p: { from?: string; to?: string; supplierId?: number; page: number; size: number },
    exec?: Executor,
  ): Promise<{ rows: ReceiptListItemRow[]; total: number }> {
    const offset = (p.page - 1) * p.size;
    const fromDate = p.from ? new Date(`${p.from}T00:00:00.000Z`) : null;
    const toDate = p.to ? new Date(`${p.to}T23:59:59.999Z`) : null;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM purchase_receipts r
       WHERE (@supId IS NULL OR r.supplier_id = @supId)
         AND (@from IS NULL OR r.receipt_date >= @from)
         AND (@to IS NULL OR r.receipt_date <= @to)`,
      {
        supId: [sql.Int, p.supplierId ?? null],
        from: [sql.DateTime2, fromDate],
        to: [sql.DateTime2, toDate],
      },
      exec,
    );

    const rowsRes = await query<ReceiptListItemRow>(
      `SELECT r.receipt_id AS receiptId, r.receipt_date AS receiptDate,
              r.total_amount AS totalAmount, r.supplier_id AS supplierId,
              s.supplier_name AS supplierName, r.employee_id AS employeeId,
              e.full_name AS employeeName,
              COUNT(d.variant_id) AS itemCount,
              ISNULL(SUM(d.quantity), 0) AS totalQuantity,
              r.is_deleted AS isDeleted
       FROM purchase_receipts r
       JOIN suppliers s ON s.supplier_id = r.supplier_id
       JOIN employees e ON e.employee_id = r.employee_id
       LEFT JOIN purchase_receipt_details d ON d.receipt_id = r.receipt_id
       WHERE (@supId IS NULL OR r.supplier_id = @supId)
         AND (@from IS NULL OR r.receipt_date >= @from)
         AND (@to IS NULL OR r.receipt_date <= @to)
       GROUP BY r.receipt_id, r.receipt_date, r.total_amount, r.supplier_id,
                s.supplier_name, r.employee_id, e.full_name, r.is_deleted
       ORDER BY r.receipt_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        supId: [sql.Int, p.supplierId ?? null],
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
        receiptDate: r.receiptDate,
        totalAmount: Number(r.totalAmount),
        itemCount: Number(r.itemCount),
        totalQuantity: Number(r.totalQuantity),
        isDeleted: Boolean(r.isDeleted),
      })),
      total: countRes.recordset[0]?.total ?? 0,
    };
  },

  async findById(id: number, exec?: Executor): Promise<ReceiptDetailRow | null> {
    const r = await query<ReceiptDetailRow>(
      `SELECT r.receipt_id AS receiptId, r.receipt_date AS receiptDate,
              r.total_amount AS totalAmount, r.supplier_id AS supplierId,
              s.supplier_name AS supplierName, s.phone AS supplierPhone,
              s.email AS supplierEmail, s.address AS supplierAddress,
              r.employee_id AS employeeId, e.full_name AS employeeName,
              COUNT(d.variant_id) AS itemCount,
              ISNULL(SUM(d.quantity), 0) AS totalQuantity,
              r.is_deleted AS isDeleted
       FROM purchase_receipts r
       JOIN suppliers s ON s.supplier_id = r.supplier_id
       JOIN employees e ON e.employee_id = r.employee_id
       LEFT JOIN purchase_receipt_details d ON d.receipt_id = r.receipt_id
       WHERE r.receipt_id = @id
       GROUP BY r.receipt_id, r.receipt_date, r.total_amount, r.supplier_id,
                s.supplier_name, s.phone, s.email, s.address,
                r.employee_id, e.full_name, r.is_deleted`,
      { id: [sql.Int, id] },
      exec,
    );
    const row = r.recordset[0];
    if (!row) return null;
    return {
      ...row,
      receiptDate: row.receiptDate,
      totalAmount: Number(row.totalAmount),
      itemCount: Number(row.itemCount),
      totalQuantity: Number(row.totalQuantity),
      isDeleted: Boolean(row.isDeleted),
    };
  },

  async findLinesByReceiptId(id: number, exec?: Executor): Promise<ReceiptLineRow[]> {
    const r = await query<ReceiptLineRow>(
      `SELECT d.variant_id AS variantId, v.sku, p.product_name AS productName,
              s.size_label AS sizeLabel, c.color_name AS colorName, p.unit,
              d.quantity, d.import_price AS importPrice, d.line_total AS lineTotal
       FROM purchase_receipt_details d
       JOIN product_variants v ON v.variant_id = d.variant_id
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE d.receipt_id = @id
       ORDER BY v.sku ASC`,
      { id: [sql.Int, id] },
      exec,
    );
    return r.recordset.map((line) => ({
      ...line,
      quantity: Number(line.quantity),
      importPrice: Number(line.importPrice),
      lineTotal: Number(line.lineTotal),
    }));
  },

  async insertReceipt(
    d: { supplierId: number; employeeId: number },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO purchase_receipts (supplier_id, employee_id)
       VALUES (@supId, @empId);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        supId: [sql.Int, d.supplierId],
        empId: [sql.Int, d.employeeId],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async insertReceiptLine(
    d: { receiptId: number; variantId: number; quantity: number; importPrice: number },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `INSERT INTO purchase_receipt_details (receipt_id, variant_id, quantity, import_price)
       VALUES (@rid, @vid, @qty, @price);`,
      {
        rid: [sql.Int, d.receiptId],
        vid: [sql.Int, d.variantId],
        qty: [sql.Int, d.quantity],
        price: [sql.Decimal(18, 2), d.importPrice],
      },
      exec,
    );
  },

  async softDelete(receiptId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE purchase_receipts SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE receipt_id = @id AND is_deleted = 0`,
      { id: [sql.Int, receiptId] },
      exec,
    );
  },
};
