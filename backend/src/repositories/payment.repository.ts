import { query, sql, type Executor } from '../config/database';
import type { PaymentMethodRow, PaymentRow, RefundRow } from '../types/payment.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { PaymentMethodRow, PaymentRow, RefundRow } from '../types/payment.types';

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const paymentMethodRepository = {
  async listActive(exec?: Executor): Promise<PaymentMethodRow[]> {
    const r = await query<PaymentMethodRow>(
      `SELECT method_id AS methodId, method_code AS methodCode, method_name AS methodName,
              is_online AS isOnline, is_active AS isActive
       FROM payment_methods
       WHERE is_active = 1 AND is_deleted = 0
       ORDER BY method_id`,
      {},
      exec,
    );
    return r.recordset;
  },

  async listAll(exec?: Executor): Promise<PaymentMethodRow[]> {
    const r = await query<PaymentMethodRow>(
      `SELECT method_id AS methodId, method_code AS methodCode, method_name AS methodName,
              is_online AS isOnline, is_active AS isActive
       FROM payment_methods
       WHERE is_deleted = 0
       ORDER BY method_id`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findById(methodId: number, exec?: Executor): Promise<PaymentMethodRow | null> {
    const r = await query<PaymentMethodRow>(
      `SELECT method_id AS methodId, method_code AS methodCode, method_name AS methodName,
              is_online AS isOnline, is_active AS isActive
       FROM payment_methods WHERE method_id = @methodId AND is_deleted = 0`,
      { methodId: [sql.Int, methodId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async create(data: { methodCode: string; methodName: string; isOnline: boolean }, exec?: Executor): Promise<number> {
    const r = await query<{ methodId: number }>(
      `INSERT INTO payment_methods (method_code, method_name, is_online, is_active)
       OUTPUT INSERTED.method_id AS methodId
       VALUES (@code, @name, @isOnline, 1)`,
      {
        code: [sql.VarChar(20), data.methodCode],
        name: [sql.NVarChar(100), data.methodName],
        isOnline: [sql.Bit, data.isOnline],
      },
      exec,
    );
    return r.recordset[0].methodId;
  },

  async setActive(methodId: number, isActive: boolean, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payment_methods SET is_active = @isActive WHERE method_id = @methodId AND is_deleted = 0`,
      { methodId: [sql.Int, methodId], isActive: [sql.Bit, isActive] },
      exec,
    );
  },

  async softDelete(methodId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payment_methods SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE method_id = @methodId`,
      { methodId: [sql.Int, methodId] },
      exec,
    );
  },
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const paymentRepository = {
  /** Lấy tất cả giao dịch của một hóa đơn (dùng cho trang chi tiết đơn). */
  async listByInvoice(invoiceId: number, exec?: Executor): Promise<PaymentRow[]> {
    const r = await query<PaymentRow>(
      `SELECT p.payment_id AS paymentId, p.invoice_id AS invoiceId,
              m.method_code AS methodCode, m.method_name AS methodName,
              p.amount, p.status, p.transaction_code AS transactionCode,
              p.proof_image_url AS proofUrl, p.note, p.paid_at AS paidAt, p.created_at AS createdAt
       FROM payments p
       JOIN payment_methods m ON m.method_id = p.method_id
       WHERE p.invoice_id = @invoiceId AND p.is_deleted = 0
       ORDER BY p.payment_id`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset;
  },

  /** Lấy giao dịch PENDING / SUCCESS mới nhất của một hóa đơn (dùng để xác nhận hoặc thanh toán lại). */
  async findActiveByInvoice(invoiceId: number, exec?: Executor): Promise<PaymentRow | null> {
    const r = await query<PaymentRow>(
      `SELECT TOP 1 p.payment_id AS paymentId, p.invoice_id AS invoiceId,
              m.method_code AS methodCode, m.method_name AS methodName,
              p.amount, p.status, p.transaction_code AS transactionCode,
              p.proof_image_url AS proofUrl, p.note, p.paid_at AS paidAt, p.created_at AS createdAt
       FROM payments p
       JOIN payment_methods m ON m.method_id = p.method_id
       WHERE p.invoice_id = @invoiceId AND p.status IN ('PENDING','SUCCESS') AND p.is_deleted = 0
       ORDER BY p.payment_id DESC`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async findById(paymentId: number, exec?: Executor): Promise<PaymentRow | null> {
    const r = await query<PaymentRow>(
      `SELECT p.payment_id AS paymentId, p.invoice_id AS invoiceId,
              m.method_code AS methodCode, m.method_name AS methodName,
              p.amount, p.status, p.transaction_code AS transactionCode,
              p.proof_image_url AS proofUrl, p.note, p.paid_at AS paidAt, p.created_at AS createdAt
       FROM payments p
       JOIN payment_methods m ON m.method_id = p.method_id
       WHERE p.payment_id = @paymentId AND p.is_deleted = 0`,
      { paymentId: [sql.Int, paymentId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /** Xác nhận thu tiền mặt: chuyển PENDING → SUCCESS. */
  async confirmCash(paymentId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payments
       SET status = 'SUCCESS', paid_at = SYSUTCDATETIME()
       WHERE payment_id = @paymentId AND status = 'PENDING' AND is_deleted = 0`,
      { paymentId: [sql.Int, paymentId] },
      exec,
    );
  },

  /** Khách tải ảnh chứng từ chuyển khoản thủ công. */
  async uploadProof(paymentId: number, proofUrl: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payments SET proof_image_url = @proofUrl WHERE payment_id = @paymentId AND is_deleted = 0`,
      { paymentId: [sql.Int, paymentId], proofUrl: [sql.NVarChar(500), proofUrl] },
      exec,
    );
  },

  /** Nhân viên đối soát chuyển khoản thủ công: SUCCESS hoặc FAILED. */
  async review(paymentId: number, status: 'SUCCESS' | 'FAILED', note: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payments
       SET status = @status,
           note = @note,
           paid_at = CASE WHEN @status = 'SUCCESS' THEN SYSUTCDATETIME() ELSE paid_at END
       WHERE payment_id = @paymentId AND status = 'PENDING' AND is_deleted = 0`,
      {
        paymentId: [sql.Int, paymentId],
        status: [sql.VarChar(10), status],
        note: [sql.NVarChar(500), note],
      },
      exec,
    );
  },

  /** Ghi nhận thanh toán webhook (MoMo/QR) — idempotent: bỏ qua nếu đã SUCCESS. */
  async markSuccess(paymentId: number, transactionCode: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE payments
       SET status = 'SUCCESS', transaction_code = @txCode, paid_at = SYSUTCDATETIME()
       WHERE payment_id = @paymentId AND status = 'PENDING' AND is_deleted = 0`,
      {
        paymentId: [sql.Int, paymentId],
        txCode: [sql.NVarChar(100), transactionCode],
      },
      exec,
    );
  },

  /** Tạo giao dịch PENDING mới (dùng khi thanh toán lại sau khi FAILED). */
  async createPending(
    invoiceId: number,
    methodId: number,
    amount: number,
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ paymentId: number }>(
      `INSERT INTO payments (invoice_id, method_id, amount, status)
       OUTPUT INSERTED.payment_id AS paymentId
       VALUES (@invoiceId, @methodId, @amount, 'PENDING')`,
      {
        invoiceId: [sql.Int, invoiceId],
        methodId: [sql.Int, methodId],
        amount: [sql.Decimal(18, 2), amount],
      },
      exec,
    );
    return r.recordset[0].paymentId;
  },

  /** Đánh dấu PENDING quá hạn thành FAILED (job định kỳ). */
  async expirePending(thresholdMinutes: number, exec?: Executor): Promise<number> {
    const r = await query(
      `UPDATE payments
       SET status = 'FAILED', note = N'Hết hạn thanh toán'
       WHERE status = 'PENDING'
         AND is_deleted = 0
         AND DATEDIFF(MINUTE, created_at, SYSUTCDATETIME()) > @minutes`,
      { minutes: [sql.Int, thresholdMinutes] },
      exec,
    );
    return r.rowsAffected[0];
  },
};

// ─── Refunds ──────────────────────────────────────────────────────────────────

export const refundRepository = {
  async listByPayment(paymentId: number, exec?: Executor): Promise<RefundRow[]> {
    const r = await query<RefundRow>(
      `SELECT refund_id AS refundId, payment_id AS paymentId, amount, reason, status,
              transaction_code AS transactionCode, completed_at AS processedAt,
              processed_by AS processedBy, requested_at AS createdAt
       FROM refunds
       WHERE payment_id = @paymentId AND is_deleted = 0
       ORDER BY refund_id`,
      { paymentId: [sql.Int, paymentId] },
      exec,
    );
    return r.recordset;
  },

  async listByInvoice(invoiceId: number, exec?: Executor): Promise<RefundRow[]> {
    const r = await query<RefundRow>(
      `SELECT r.refund_id AS refundId, r.payment_id AS paymentId, r.amount, r.reason,
              r.status, r.transaction_code AS transactionCode, r.completed_at AS processedAt,
              r.processed_by AS processedBy, r.requested_at AS createdAt
       FROM refunds r
       JOIN payments p ON p.payment_id = r.payment_id
       WHERE p.invoice_id = @invoiceId AND r.is_deleted = 0
       ORDER BY r.refund_id`,
      { invoiceId: [sql.Int, invoiceId] },
      exec,
    );
    return r.recordset;
  },

  async findById(refundId: number, exec?: Executor): Promise<RefundRow | null> {
    const r = await query<RefundRow>(
      `SELECT refund_id AS refundId, payment_id AS paymentId, amount, reason, status,
              transaction_code AS transactionCode, completed_at AS processedAt,
              processed_by AS processedBy, requested_at AS createdAt
       FROM refunds WHERE refund_id = @refundId AND is_deleted = 0`,
      { refundId: [sql.Int, refundId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /** Tổng số tiền đã hoàn (trạng thái SUCCESS) của một giao dịch gốc. */
  async sumSuccessByPayment(paymentId: number, exec?: Executor): Promise<number> {
    const r = await query<{ total: number }>(
      `SELECT ISNULL(SUM(amount), 0) AS total FROM refunds WHERE payment_id = @paymentId AND status = 'SUCCESS' AND is_deleted = 0`,
      { paymentId: [sql.Int, paymentId] },
      exec,
    );
    return r.recordset[0].total;
  },

  async create(
    data: { paymentId: number; amount: number; reason: string },
    exec?: Executor,
  ): Promise<number> {
    const pay = await query<{ methodId: number }>(
      `SELECT method_id AS methodId FROM payments WHERE payment_id = @id`,
      { id: [sql.Int, data.paymentId] },
      exec,
    );
    const methodId = pay.recordset[0]?.methodId ?? 1;

    const r = await query<{ refundId: number }>(
      `INSERT INTO refunds (payment_id, method_id, amount, reason, status)
       OUTPUT INSERTED.refund_id AS refundId
       VALUES (@paymentId, @methodId, @amount, @reason, 'PENDING')`,
      {
        paymentId: [sql.Int, data.paymentId],
        methodId: [sql.Int, methodId],
        amount: [sql.Decimal(18, 2), data.amount],
        reason: [sql.NVarChar(255), data.reason],
      },
      exec,
    );
    return r.recordset[0].refundId;
  },

  async complete(
    refundId: number,
    transactionCode: string,
    processedBy: number,
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE refunds
       SET status = 'SUCCESS', transaction_code = @txCode,
           completed_at = SYSUTCDATETIME(), processed_by = @processedBy
       WHERE refund_id = @refundId AND status = 'PENDING' AND is_deleted = 0`,
      {
        refundId: [sql.Int, refundId],
        txCode: [sql.NVarChar(100), transactionCode],
        processedBy: [sql.Int, processedBy],
      },
      exec,
    );
  },

  async reject(refundId: number, reason: string, processedBy: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE refunds
       SET status = 'FAILED', reason = @reason,
           completed_at = SYSUTCDATETIME(), processed_by = @processedBy
       WHERE refund_id = @refundId AND status = 'PENDING' AND is_deleted = 0`,
      {
        refundId: [sql.Int, refundId],
        reason: [sql.NVarChar(255), reason],
        processedBy: [sql.Int, processedBy],
      },
      exec,
    );
  },
};
