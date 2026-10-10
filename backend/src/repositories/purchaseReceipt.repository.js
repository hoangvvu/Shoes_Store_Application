const { query, transaction, sql } = require('../config/database');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/mapper.util');

const purchaseReceiptRepository = {
  async findAll({ supplierId = null, employeeId = null, fromDate = null, toDate = null, page = 1, size = 10 }) {
    const offset = (page - 1) * size;
    let filterSql = 'WHERE r.is_deleted = 0';

    if (supplierId) {
      filterSql += ' AND r.supplier_id = @supplierId';
    }
    if (employeeId) {
      filterSql += ' AND r.employee_id = @employeeId';
    }
    if (fromDate) {
      filterSql += ' AND r.receipt_date >= @fromDate';
    }
    if (toDate) {
      filterSql += ' AND r.receipt_date < @toDate';
    }

    const countSql = `SELECT COUNT(*) AS total FROM purchase_receipts r ${filterSql}`;
    const selectSql = `
      SELECT r.receipt_id, r.receipt_date, r.total_amount, r.is_deleted,
             s.supplier_id, s.supplier_name, s.phone AS supplier_phone,
             e.employee_id, e.full_name AS employee_name,
             (SELECT COUNT(*) FROM purchase_receipt_details d WHERE d.receipt_id = r.receipt_id) AS item_count,
             (SELECT ISNULL(SUM(d.quantity), 0) FROM purchase_receipt_details d WHERE d.receipt_id = r.receipt_id) AS total_quantity
      FROM purchase_receipts r
      JOIN suppliers s ON s.supplier_id = r.supplier_id
      JOIN employees e ON e.employee_id = r.employee_id
      ${filterSql}
      ORDER BY r.receipt_id DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const params = {
      supplierId: supplierId || null,
      employeeId: employeeId || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
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

  async findById(receiptId) {
    const headerSql = `
      SELECT r.receipt_id, r.receipt_date, r.total_amount, r.is_deleted,
             s.supplier_id, s.supplier_name, s.phone AS supplier_phone, s.email AS supplier_email, s.address AS supplier_address,
             e.employee_id, e.full_name AS employee_name, e.phone AS employee_phone
      FROM purchase_receipts r
      JOIN suppliers s ON s.supplier_id = r.supplier_id
      JOIN employees e ON e.employee_id = r.employee_id
      WHERE r.receipt_id = @receiptId AND r.is_deleted = 0
    `;
    const headerRes = await query(headerSql, { receiptId });
    if (!headerRes.recordset[0]) return null;

    const receipt = mapRowToCamel(headerRes.recordset[0]);

    const detailsSql = `
      SELECT d.receipt_id, d.variant_id, d.quantity, d.import_price, d.line_total,
             v.sku, v.stock_quantity,
             sz.size_label, cl.color_name,
             p.product_id, p.product_name, p.unit
      FROM purchase_receipt_details d
      JOIN product_variants v ON v.variant_id = d.variant_id
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes sz ON sz.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      WHERE d.receipt_id = @receiptId
      ORDER BY d.variant_id ASC
    `;
    const detailsRes = await query(detailsSql, { receiptId });
    receipt.details = mapRowsToCamel(detailsRes.recordset);

    return receipt;
  },

  /**
   * Create purchase receipt and its details in a transaction.
   * Trigger trg_receipt_details_ai will automatically record IMPORT into inventory_transactions,
   * update stock_quantity, and recalculate total_amount on purchase_receipts.
   */
  async create({ employeeId, supplierId, items }, actorUserId = null) {
    return transaction(async (req) => {
      // 1. Insert header
      req.input('employeeId', sql.Int, employeeId);
      req.input('supplierId', sql.Int, supplierId);

      const headerRes = await req.query(`
        INSERT INTO purchase_receipts (employee_id, supplier_id)
        OUTPUT INSERTED.receipt_id
        VALUES (@employeeId, @supplierId);
      `);
      const receiptId = headerRes.recordset[0].receipt_id;

      // 2. Consolidate lines if duplicate variantId is provided
      const consolidated = new Map();
      for (const line of items) {
        const vId = parseInt(line.variantId, 10);
        const qty = parseInt(line.quantity, 10);
        const price = Number(line.importPrice);

        if (consolidated.has(vId)) {
          const existing = consolidated.get(vId);
          existing.quantity += qty;
          existing.importPrice = price; // latest price
        } else {
          consolidated.set(vId, { variantId: vId, quantity: qty, importPrice: price });
        }
      }

      // 3. Insert details lines
      let idx = 0;
      for (const line of consolidated.values()) {
        req.input(`rid_${idx}`, sql.Int, receiptId);
        req.input(`vid_${idx}`, sql.Int, line.variantId);
        req.input(`qty_${idx}`, sql.Int, line.quantity);
        req.input(`price_${idx}`, sql.Decimal(18, 2), line.importPrice);

        await req.query(`
          INSERT INTO purchase_receipt_details (receipt_id, variant_id, quantity, import_price)
          VALUES (@rid_${idx}, @vid_${idx}, @qty_${idx}, @price_${idx});
        `);
        idx++;
      }

      return receiptId;
    }, actorUserId);
  },

  /**
   * Soft delete purchase receipt in a transaction.
   * Trigger trg_receipts_au will automatically create IMPORT_REVERSAL transactions,
   * which reduces stock. If stock drops below 0, it aborts and rolls back.
   */
  async softDelete(receiptId, actorUserId = null) {
    return transaction(async (req) => {
      req.input('receiptId', sql.Int, receiptId);

      await req.query(`
        UPDATE purchase_receipts
        SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
        WHERE receipt_id = @receiptId AND is_deleted = 0;
      `);

      return true;
    }, actorUserId);
  },
};

module.exports = purchaseReceiptRepository;
