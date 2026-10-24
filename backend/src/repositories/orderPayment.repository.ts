import { query, sql, type Executor } from '../config/database';
import type { PaymentMethodRow } from '../types/orderPayment.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { PaymentMethodRow } from '../types/orderPayment.types';

/** Phần thanh toán mà luồng đơn hàng cần (tạo PENDING / ghi SUCCESS khi POS). Xác nhận, hoàn tiền thuộc M9. */
export const orderPaymentRepository = {
  async findMethod(code: string, exec?: Executor): Promise<PaymentMethodRow | null> {
    const r = await query<PaymentMethodRow>(
      `SELECT method_id AS methodId, method_code AS methodCode, method_name AS methodName, is_online AS isOnline
       FROM payment_methods WHERE method_code = @code AND is_active = 1 AND is_deleted = 0`,
      { code: [sql.VarChar(20), code] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async createPending(invoiceId: number, methodId: number, amount: number, exec?: Executor): Promise<void> {
    await query(
      `INSERT INTO payments (invoice_id, method_id, amount, status) VALUES (@invoiceId, @methodId, @amount, 'PENDING')`,
      { invoiceId: [sql.Int, invoiceId], methodId: [sql.Int, methodId], amount: [sql.Decimal(18, 2), amount] },
      exec,
    );
  },

  /** Bán tại quầy: thu đủ tiền ngay. */
  async createSuccess(
    invoiceId: number,
    methodId: number,
    amount: number,
    exec?: Executor,
    transactionCode?: string | null,
  ): Promise<void> {
    await query(
      `INSERT INTO payments (invoice_id, method_id, amount, status, paid_at, transaction_code)
       VALUES (@invoiceId, @methodId, @amount, 'SUCCESS', SYSUTCDATETIME(), @txn)`,
      {
        invoiceId: [sql.Int, invoiceId],
        methodId: [sql.Int, methodId],
        amount: [sql.Decimal(18, 2), amount],
        txn: [sql.VarChar(100), transactionCode ?? null],
      },
      exec,
    );
  },

  /** Sửa đơn PENDING: cập nhật số tiền của giao dịch đang chờ cho khớp tổng mới. */
  async updatePendingAmount(invoiceId: number, amount: number, exec?: Executor): Promise<void> {
    if (amount > 0) {
      await query(
        `UPDATE payments SET amount = @amount WHERE invoice_id = @invoiceId AND status = 'PENDING' AND is_deleted = 0`,
        { invoiceId: [sql.Int, invoiceId], amount: [sql.Decimal(18, 2), amount] },
        exec,
      );
    } else {
      await this.discardPending(invoiceId, exec); // amount phải > 0: đơn 0đ không cần giao dịch chờ
    }
  },

  /** Hủy/xóa đơn: các giao dịch chưa thu chuyển FAILED (không còn hiệu lực). */
  async failPending(invoiceId: number, note: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payments SET status = 'FAILED', note = @note WHERE invoice_id = @invoiceId AND status = 'PENDING' AND is_deleted = 0`,
      { invoiceId: [sql.Int, invoiceId], note: [sql.NVarChar(255), note] },
      exec,
    );
  },

  async discardPending(invoiceId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payments SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE invoice_id = @invoiceId AND status = 'PENDING' AND is_deleted = 0`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
  },

  async listByInvoice(invoiceId: number, exec?: Executor) {
    const r = await query<{
      paymentId: number; methodCode: string; methodName: string; amount: number;
      status: string; paidAt: Date | null; createdAt: Date; transactionCode: string | null;
    }>(
      `SELECT p.payment_id AS paymentId, m.method_code AS methodCode, m.method_name AS methodName,
              p.amount, p.status, p.paid_at AS paidAt, p.created_at AS createdAt, p.transaction_code AS transactionCode
       FROM payments p JOIN payment_methods m ON m.method_id = p.method_id
       WHERE p.invoice_id = @invoiceId AND p.is_deleted = 0 ORDER BY p.payment_id`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset;
  },

  /** Các lần hoàn tiền của đơn (M9 ghi vào bảng refunds); hiển thị trong chi tiết hóa đơn. */
  async listRefundsByInvoice(invoiceId: number, exec?: Executor) {
    const r = await query<{
      refundId: number; paymentId: number; methodName: string; amount: number; status: string;
      reason: string; transactionCode: string | null; requestedAt: Date; completedAt: Date | null;
      processedByName: string | null;
    }>(
      `SELECT rf.refund_id AS refundId, rf.payment_id AS paymentId, m.method_name AS methodName, rf.amount, rf.status,
              rf.reason, rf.transaction_code AS transactionCode, rf.requested_at AS requestedAt, rf.completed_at AS completedAt,
              NULLIF(LTRIM(RTRIM(CONCAT(e.last_name, N' ', e.first_name))), N'') AS processedByName
       FROM refunds rf
       JOIN payments p ON p.payment_id = rf.payment_id
       JOIN payment_methods m ON m.method_id = rf.method_id
       LEFT JOIN employees e ON e.employee_id = rf.processed_by
       WHERE p.invoice_id = @invoiceId AND rf.is_deleted = 0
       ORDER BY rf.refund_id`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset.map((x) => ({ ...x, amount: Number(x.amount) }));
  },
};
