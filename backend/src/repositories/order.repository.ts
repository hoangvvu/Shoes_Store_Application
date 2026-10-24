import { query, sql, type Executor, type Param } from '../config/database';
import type { Channel, OrderStatus } from '../constants/order.constant';
import { searchPattern, unaccent } from '../utils/search';

export interface OrderListRow {
  invoiceId: number;
  invoiceDate: Date;
  channel: Channel;
  orderStatus: OrderStatus;
  customerId: number | null;
  customerName: string | null;
  employeeName: string | null;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  paymentStatus: string;
  paidAmount: number;
  refundedAmount: number;
}

export interface InvoiceSummary {
  /** Số hóa đơn khớp bộ lọc. */
  count: number;
  /** Tổng tiền đã thu. */
  paidTotal: number;
  /** Tổng tiền đã hoàn. */
  refundedTotal: number;
  /** Doanh thu thực = đã thu - đã hoàn. */
  netTotal: number;
}

export interface OrderRow extends OrderListRow {
  customerPhone: string | null;
  employeeId: number | null;
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  promotionId: number | null;
  promotionName: string | null;
  voucherCode: string | null;
  stockDeducted: boolean;
  note: string | null;
}

export interface OrderLineRow {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  salePrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface HistoryRow {
  historyId: number;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedAt: Date;
  changedByName: string | null;
  note: string | null;
}

export interface SaleVariantRow {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  unitPrice: number;
  stockQuantity: number;
  sellable: boolean;
}

export interface ListFilter {
  status?: string;
  channel?: string;
  from?: Date;
  to?: Date;
  customerId?: number;
  employeeId?: number;
  q?: string;
  /** Chỉ lấy hóa đơn: 'ANY' = đã hoàn thành+đã thanh toán hoặc đã hoàn tiền; hoặc một loại cụ thể. */
  invoice?: 'ANY' | 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
  page: number;
  size: number;
}

const VN_OFFSET_MS = 7 * 3600 * 1000; // ngày lọc theo giờ GMT+7, dữ liệu lưu UTC

/**
 * Họ tên khách / nhân viên ghép từ last_name + first_name. NULLIF để trả NULL (không phải chuỗi rỗng)
 * khi LEFT JOIN không có bản ghi, giúp COALESCE(..., receiver_name) và "Khách lẻ" ở giao diện vẫn đúng.
 */
const CUSTOMER_NAME = `NULLIF(LTRIM(RTRIM(CONCAT(c.last_name, N' ', c.first_name))), N'')`;
const EMPLOYEE_NAME = `NULLIF(LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))), N'')`;

const ORDER_COLS = `
  i.invoice_id AS invoiceId, i.invoice_date AS invoiceDate, i.channel, i.order_status AS orderStatus,
  i.customer_id AS customerId, COALESCE(${CUSTOMER_NAME}, i.receiver_name) AS customerName, ${EMPLOYEE_NAME} AS employeeName,
  i.total_amount AS totalAmount, i.discount_amount AS discountAmount, i.amount_payable AS amountPayable,
  ISNULL(ps.payment_status, 'UNPAID') AS paymentStatus,
  ISNULL(ps.paid_amount, 0) AS paidAmount, ISNULL(ps.refunded_amount, 0) AS refundedAmount`;

const ORDER_FROM = `
  FROM invoices i
  LEFT JOIN customers c ON c.customer_id = i.customer_id
  LEFT JOIN employees e ON e.employee_id = i.employee_id
  LEFT JOIN vw_invoice_payment_status ps ON ps.invoice_id = i.invoice_id`;

export const orderRepository = {
  /* ---------- tạo / ghi đơn ---------- */

  async insertInvoice(
    d: {
      channel: Channel;
      employeeId?: number | null;
      customerId?: number | null;
      addressId?: number | null;
      receiverName?: string | null;
      receiverPhone?: string | null;
      shippingAddress?: string | null;
      note?: string | null;
    },
    exec?: Executor,
  ): Promise<number> {
    // Không dùng OUTPUT: bảng invoices có trigger. Trigger tự ghi dòng lịch sử đầu tiên (cần setActor trước).
    const r = await query<{ id: number }>(
      `INSERT INTO invoices (channel, employee_id, customer_id, shipping_address_id, receiver_name, receiver_phone, shipping_address, note)
       VALUES (@channel, @employeeId, @customerId, @addressId, @receiverName, @receiverPhone, @shippingAddress, @note);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        channel: [sql.VarChar(10), d.channel],
        employeeId: [sql.Int, d.employeeId ?? null],
        customerId: [sql.Int, d.customerId ?? null],
        addressId: [sql.Int, d.addressId ?? null],
        receiverName: [sql.NVarChar(100), d.receiverName ?? null],
        receiverPhone: [sql.VarChar(20), d.receiverPhone ?? null],
        shippingAddress: [sql.NVarChar(500), d.shippingAddress ?? null],
        note: [sql.NVarChar(500), d.note ?? null],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  /** Trigger invoice_details tự cộng lại total_amount của đơn. */
  async insertDetail(
    invoiceId: number,
    d: { variantId: number; quantity: number; salePrice: number; discountAmount: number },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `INSERT INTO invoice_details (invoice_id, variant_id, quantity, sale_price, discount_amount)
       VALUES (@invoiceId, @variantId, @quantity, @salePrice, @discount)`,
      {
        invoiceId: [sql.Int, invoiceId],
        variantId: [sql.Int, d.variantId],
        quantity: [sql.Int, d.quantity],
        salePrice: [sql.Decimal(18, 2), d.salePrice],
        discount: [sql.Decimal(18, 2), d.discountAmount],
      },
      exec,
    );
  },

  async deleteDetails(invoiceId: number, exec?: Executor): Promise<void> {
    await query(`DELETE FROM invoice_details WHERE invoice_id = @invoiceId`, { invoiceId: [sql.Int, invoiceId] }, exec);
  },

  /** Ghi giảm giá cấp hóa đơn SAU khi đã có chi tiết (CSDL ràng buộc discount ≤ total). */
  async setInvoiceDiscount(
    invoiceId: number,
    d: { discountAmount: number; promotionId: number | null; voucherCode: string | null },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE invoices SET discount_amount = @discount, promotion_id = @promotionId, voucher_code = @voucherCode
       WHERE invoice_id = @invoiceId`,
      {
        invoiceId: [sql.Int, invoiceId],
        discount: [sql.Decimal(18, 2), d.discountAmount],
        promotionId: [sql.Int, d.promotionId],
        voucherCode: [sql.VarChar(30), d.voucherCode],
      },
      exec,
    );
  },

  /** Chỉ dùng khi sửa chi tiết: đưa giảm giá hóa đơn về 0 để không vi phạm ck_inv_discount khi total tụt. */
  async clearInvoiceDiscountAmount(invoiceId: number, exec?: Executor): Promise<void> {
    await query(`UPDATE invoices SET discount_amount = 0 WHERE invoice_id = @invoiceId`, { invoiceId: [sql.Int, invoiceId] }, exec);
  },

  async getTotal(invoiceId: number, exec?: Executor): Promise<number> {
    const r = await query<{ total: number }>(
      `SELECT total_amount AS total FROM invoices WHERE invoice_id = @invoiceId`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return Number(r.recordset[0].total);
  },

  /** Mọi đổi trạng thái đều đi qua stored procedure (UPDATE + lịch sử + kho trong 1 transaction). */
  async changeStatus(
    p: { invoiceId: number; newStatus: OrderStatus; userId: number; note?: string | null },
    exec: Executor,
  ): Promise<void> {
    const req = new sql.Request(exec as sql.Transaction);
    req.input('invoice_id', sql.Int, p.invoiceId);
    req.input('new_status', sql.VarChar(10), p.newStatus);
    req.input('user_id', sql.Int, p.userId);
    req.input('note', sql.NVarChar(500), p.note ?? null);
    await req.execute('dbo.sp_change_order_status');
  },

  async addTotalPurchased(customerId: number, amount: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE customers SET total_purchased = total_purchased + @amount WHERE customer_id = @customerId`,
      { customerId: [sql.Int, customerId], amount: [sql.Decimal(18, 2), amount] },
      exec,
    );
  },

  async softDelete(invoiceId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE invoices SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE invoice_id = @invoiceId AND is_deleted = 0`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
  },

  /* ---------- đọc ---------- */

  /** Khóa dòng đơn trong transaction để chặn hai thao tác đổi trạng thái chạy chồng. */
  async lock(invoiceId: number, exec: Executor) {
    const r = await query<{
      invoiceId: number; channel: Channel; orderStatus: OrderStatus; customerId: number | null;
      stockDeducted: boolean; voucherCode: string | null; promotionId: number | null;
      totalAmount: number; amountPayable: number;
    }>(
      `SELECT invoice_id AS invoiceId, channel, order_status AS orderStatus, customer_id AS customerId,
              stock_deducted AS stockDeducted, voucher_code AS voucherCode, promotion_id AS promotionId,
              total_amount AS totalAmount, amount_payable AS amountPayable
       FROM invoices WITH (UPDLOCK, HOLDLOCK) WHERE invoice_id = @invoiceId AND is_deleted = 0`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /** Khóa giỏ ACTIVE của khách: hai lần bấm "Đặt hàng" cùng lúc chỉ tạo được 1 đơn. */
  async lockActiveCartId(customerId: number, exec: Executor): Promise<number | null> {
    const r = await query<{ cartId: number }>(
      `SELECT cart_id AS cartId FROM carts WITH (UPDLOCK, HOLDLOCK)
       WHERE customer_id = @customerId AND status = 'ACTIVE' AND is_deleted = 0`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0]?.cartId ?? null;
  },

  async findOrder(invoiceId: number, exec?: Executor): Promise<OrderRow | null> {
    const r = await query<OrderRow>(
      `SELECT ${ORDER_COLS},
              c.phone AS customerPhone, i.employee_id AS employeeId, i.receiver_name AS receiverName,
              i.receiver_phone AS receiverPhone, i.shipping_address AS shippingAddress,
              i.promotion_id AS promotionId, pr.promotion_name AS promotionName, i.voucher_code AS voucherCode,
              i.stock_deducted AS stockDeducted, i.note
       ${ORDER_FROM}
       LEFT JOIN promotions pr ON pr.promotion_id = i.promotion_id
       WHERE i.invoice_id = @invoiceId AND i.is_deleted = 0`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async listLines(invoiceId: number, exec?: Executor): Promise<OrderLineRow[]> {
    const r = await query<OrderLineRow>(
      `SELECT d.variant_id AS variantId, p.product_id AS productId, p.product_name AS productName, p.image_url AS imageUrl,
              v.sku, sz.size_label AS sizeLabel, c.color_name AS colorName,
              d.quantity, d.sale_price AS salePrice, d.discount_amount AS discountAmount, d.line_total AS lineTotal
       FROM invoice_details d
       JOIN product_variants v ON v.variant_id = d.variant_id
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes sz ON sz.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE d.invoice_id = @invoiceId ORDER BY d.variant_id`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset;
  },

  /** Timeline: trạng thái cũ → mới, người đổi, thời gian, ghi chú. */
  async listHistory(invoiceId: number, exec?: Executor): Promise<HistoryRow[]> {
    const r = await query<HistoryRow>(
      `SELECT h.history_id AS historyId, h.old_status AS oldStatus, h.new_status AS newStatus, h.changed_at AS changedAt,
              COALESCE(${EMPLOYEE_NAME}, ${CUSTOMER_NAME}, u.username) AS changedByName, h.note
       FROM order_status_history h
       LEFT JOIN users u ON u.user_id = h.changed_by
       LEFT JOIN employees e ON e.employee_id = u.employee_id
       LEFT JOIN customers c ON c.customer_id = u.customer_id
       WHERE h.invoice_id = @invoiceId ORDER BY h.history_id`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset;
  },

  async list(
    f: ListFilter,
    exec?: Executor,
  ): Promise<{ rows: OrderListRow[]; total: number; summary?: InvoiceSummary }> {
    const qNum = f.q && /^\d{1,9}$/.test(f.q) ? Number(f.q) : null;
    const params: Record<string, Param> = {
      status: [sql.VarChar(10), f.status ?? null],
      channel: [sql.VarChar(10), f.channel ?? null],
      customerId: [sql.Int, f.customerId ?? null],
      employeeId: [sql.Int, f.employeeId ?? null],
      fromUtc: [sql.DateTime2(3), f.from ? new Date(f.from.getTime() - VN_OFFSET_MS) : null],
      toUtc: [sql.DateTime2(3), f.to ? new Date(f.to.getTime() + 24 * 3600 * 1000 - VN_OFFSET_MS) : null],
      pattern: [sql.NVarChar(210), f.q ? searchPattern(f.q) : null],
      qId: [sql.Int, qNum],
      inv: [sql.VarChar(20), f.invoice ?? null],
    };
    // Hóa đơn = (đã giao + đã thanh toán đủ) HOẶC đã có hoàn tiền. Hoàn thành và hoàn tiền là hai trạng thái tách biệt.
    const PAY = `ISNULL(ps.payment_status, 'UNPAID')`;
    const where = `i.is_deleted = 0
      AND (@status IS NULL OR i.order_status = @status)
      AND (@channel IS NULL OR i.channel = @channel)
      AND (@customerId IS NULL OR i.customer_id = @customerId)
      AND (@employeeId IS NULL OR i.employee_id = @employeeId)
      AND (@fromUtc IS NULL OR i.invoice_date >= @fromUtc)
      AND (@toUtc IS NULL OR i.invoice_date < @toUtc)
      AND (@pattern IS NULL OR i.invoice_id = @qId OR ${unaccent(CUSTOMER_NAME)} LIKE @pattern ESCAPE '\\' OR ${unaccent('i.receiver_name')} LIKE @pattern ESCAPE '\\' OR ${unaccent('c.phone')} LIKE @pattern ESCAPE '\\')
      AND (@inv IS NULL
           OR (@inv IN ('ANY', 'COMPLETED') AND i.order_status = 'DELIVERED' AND ${PAY} = 'PAID')
           OR (@inv IN ('ANY', 'PARTIALLY_REFUNDED') AND ${PAY} = 'PARTIALLY_REFUNDED')
           OR (@inv IN ('ANY', 'REFUNDED') AND ${PAY} = 'REFUNDED'))`;

    const count = await query<{ total: number; paid: number; refunded: number }>(
      `SELECT COUNT(*) AS total, ISNULL(SUM(ps.paid_amount), 0) AS paid, ISNULL(SUM(ps.refunded_amount), 0) AS refunded
       ${ORDER_FROM} WHERE ${where}`,
      params,
      exec,
    );
    const rows = await query<OrderListRow>(
      `SELECT ${ORDER_COLS} ${ORDER_FROM} WHERE ${where}
       ORDER BY i.invoice_id DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { ...params, offset: [sql.Int, (f.page - 1) * f.size], size: [sql.Int, f.size] },
      exec,
    );
    const c = count.recordset[0];
    const out: { rows: OrderListRow[]; total: number; summary?: InvoiceSummary } = {
      rows: rows.recordset.map((r) => ({ ...r, paidAmount: Number(r.paidAmount), refundedAmount: Number(r.refundedAmount) })),
      total: c.total,
    };
    if (f.invoice) {
      const paidTotal = Number(c.paid);
      const refundedTotal = Number(c.refunded);
      out.summary = { count: c.total, paidTotal, refundedTotal, netTotal: paidTotal - refundedTotal };
    }
    return out;
  },

  /** Thông tin biến thể để bán: giá hiện hành, tồn kho, còn kinh doanh hay không. Giá luôn lấy từ products.current_price. */
  async getSaleVariants(variantIds: number[], exec?: Executor): Promise<SaleVariantRow[]> {
    if (!variantIds.length) return [];
    const list = variantIds.map((n) => Math.trunc(Number(n))).join(','); // số nguyên đã kiểm soát
    const r = await query<SaleVariantRow>(
      `SELECT v.variant_id AS variantId, p.product_id AS productId, p.product_name AS productName, p.image_url AS imageUrl,
              v.sku, sz.size_label AS sizeLabel, c.color_name AS colorName,
              p.current_price AS unitPrice, v.stock_quantity AS stockQuantity,
              CAST(CASE WHEN v.is_deleted = 0 AND p.is_deleted = 0 AND p.is_active = 1 THEN 1 ELSE 0 END AS BIT) AS sellable
       FROM product_variants v
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes sz ON sz.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.variant_id IN (${list})`,
      {},
      exec,
    );
    return r.recordset.map((x) => ({ ...x, unitPrice: Number(x.unitPrice) }));
  },

  async customerExists(customerId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM customers WHERE customer_id = @customerId AND is_deleted = 0`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async paidAmount(invoiceId: number, exec?: Executor): Promise<number> {
    const r = await query<{ paid: number }>(
      `SELECT ISNULL(paid_amount, 0) AS paid FROM vw_invoice_payment_status WHERE invoice_id = @invoiceId`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return Number(r.recordset[0]?.paid ?? 0);
  },
};
