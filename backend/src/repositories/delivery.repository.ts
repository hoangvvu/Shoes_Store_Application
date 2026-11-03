import { query, sql, type Executor } from '../config/database';
import type { DeliveryLineRow, DeliveryOrderRow } from '../types/delivery.types';

const ORDER_COLS = `
  invoice_id AS invoiceId, invoice_date AS invoiceDate, channel,
  receiver_name AS receiverName, receiver_phone AS receiverPhone, shipping_address AS shippingAddress,
  total_amount AS totalAmount, discount_amount AS discountAmount,
  (total_amount - discount_amount) AS amountPayable, order_status AS orderStatus,
  note`;

const num = (r: DeliveryOrderRow): DeliveryOrderRow => ({
  ...r,
  totalAmount: Number(r.totalAmount),
  discountAmount: Number(r.discountAmount),
  amountPayable: Number(r.amountPayable),
});

export const deliveryRepository = {
  async listShipping(exec?: Executor): Promise<DeliveryOrderRow[]> {
    const r = await query<DeliveryOrderRow>(
      `SELECT ${ORDER_COLS} FROM invoices WHERE order_status = 'SHIPPING' AND is_deleted = 0 ORDER BY invoice_date DESC`,
      {},
      exec,
    );
    return r.recordset.map(num);
  },

  async findOrder(invoiceId: number, exec?: Executor): Promise<DeliveryOrderRow | null> {
    const r = await query<DeliveryOrderRow>(
      `SELECT ${ORDER_COLS} FROM invoices WHERE invoice_id = @id AND is_deleted = 0`,
      { id: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset[0] ? num(r.recordset[0]) : null;
  },

  async listLines(invoiceId: number, exec?: Executor): Promise<DeliveryLineRow[]> {
    const r = await query<DeliveryLineRow>(
      `SELECT d.variant_id AS variantId, p.product_name AS productName, s.size_label AS sizeLabel,
              c.color_name AS colorName, d.quantity, d.sale_price AS salePrice, d.line_total AS lineTotal
       FROM invoice_details d
       JOIN product_variants v ON v.variant_id = d.variant_id
       JOIN products p ON p.product_id = v.product_id
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE d.invoice_id = @id`,
      { id: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset;
  },

  /**
   * Chốt thu tiền: đổi hình thức về đúng cách người giao đã thu (tiền mặt / QR / ví),
   * PENDING -> SUCCESS. Trả số dòng ảnh hưởng (0 = giao dịch không còn ở trạng thái chờ).
   */
  async settlePayment(
    paymentId: number,
    invoiceId: number,
    methodId: number,
    transactionCode: string | null,
    exec?: Executor,
  ): Promise<number> {
    const r = await query(
      `UPDATE payments
       SET method_id = @methodId, status = 'SUCCESS', paid_at = SYSUTCDATETIME(), transaction_code = @txn
       WHERE payment_id = @paymentId AND invoice_id = @invoiceId AND status = 'PENDING' AND is_deleted = 0`,
      {
        paymentId: [sql.Int, paymentId],
        invoiceId: [sql.Int, invoiceId],
        methodId: [sql.Int, methodId],
        txn: [sql.VarChar(100), transactionCode],
      },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  /** Ghi chú của người bàn giao vận chuyển (lần chuyển sang SHIPPING gần nhất) dành cho nhân viên giao hàng. */
  async findShippingNote(invoiceId: number, exec?: Executor): Promise<string | null> {
    const r = await query<{ note: string | null }>(
      `SELECT TOP 1 note FROM order_status_history
       WHERE invoice_id = @id AND new_status = 'SHIPPING' AND note IS NOT NULL AND LTRIM(RTRIM(note)) <> ''
       ORDER BY history_id DESC`,
      { id: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset[0]?.note ?? null;
  },

  /** Ghi nhân viên giao hàng (migration 003_shipper_employee.sql). */
  async setShipper(invoiceId: number, employeeId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE invoices SET shipper_employee_id = @empId WHERE invoice_id = @id AND is_deleted = 0`,
      { id: [sql.Int, invoiceId], empId: [sql.Int, employeeId] },
      exec,
    );
  },
};
