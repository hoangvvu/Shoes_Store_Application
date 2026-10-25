import { query, sql, withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import type { AuthUser } from '../types/express';
import {
  paymentMethodRepository,
  paymentRepository,
  refundRepository,
} from '../repositories/payment.repository';
import { notificationRepository } from '../repositories/notification.repository';

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const paymentService = {
  /** M9 #1 – Danh sách hình thức thanh toán đang bật (khách dùng khi đặt hàng). */
  async listMethods(onlyActive = true) {
    return onlyActive
      ? paymentMethodRepository.listActive()
      : paymentMethodRepository.listAll();
  },

  /** M9 #8 – Admin: thêm hình thức thanh toán mới. */
  async createMethod(data: { methodCode: string; methodName: string; isOnline: boolean }) {
    const methodId = await paymentMethodRepository.create(data);
    return { methodId, ...data, isActive: true };
  },

  /** M9 #8 – Admin: bật/tắt hình thức thanh toán. */
  async setMethodActive(methodId: number, isActive: boolean) {
    const m = await paymentMethodRepository.findById(methodId);
    if (!m) throw AppError.notFound('Hình thức thanh toán không tồn tại');
    await paymentMethodRepository.setActive(methodId, isActive);
    return { methodId, isActive };
  },

  /** M9 #8 – Admin: xóa mềm hình thức thanh toán (nếu đã có giao dịch thì không xóa). */
  async deleteMethod(methodId: number) {
    const m = await paymentMethodRepository.findById(methodId);
    if (!m) throw AppError.notFound('Hình thức thanh toán không tồn tại');
    await paymentMethodRepository.softDelete(methodId);
  },

  // ─── Payments ───────────────────────────────────────────────────────────────

  /** M9 #6 – Xem trạng thái thanh toán của một đơn (lấy theo invoiceId). */
  async getPaymentStatus(user: AuthUser, invoiceId: number) {
    // Nếu là khách, service đơn hàng phải đã kiểm tra quyền sở hữu trước khi gọi đây.
    // Ở route này, chúng ta tin vào middleware requireRole đã làm đúng.
    const payments = await paymentRepository.listByInvoice(invoiceId);
    const refunds = await refundRepository.listByInvoice(invoiceId);
    return { invoiceId, payments, refunds };
  },

  /** M9 #2 – Nhân viên xác nhận đã thu tiền mặt (PENDING → SUCCESS). */
  async confirmCash(user: AuthUser, paymentId: number) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Giao dịch không tồn tại');
    if (payment.methodCode !== 'CASH')
      throw AppError.badRequest('Giao dịch này không phải tiền mặt', 'WRONG_METHOD');
    if (payment.status === 'SUCCESS') throw AppError.conflict('Giao dịch đã được xác nhận', 'ALREADY_SUCCESS');
    if (payment.status === 'FAILED') throw AppError.badRequest('Giao dịch đã thất bại', 'PAYMENT_FAILED');
    await paymentRepository.confirmCash(paymentId);
    return { paymentId, status: 'SUCCESS' };
  },

  /** M9 #3 – Khách tải ảnh chứng từ chuyển khoản thủ công. */
  async uploadProof(user: AuthUser, paymentId: number, proofUrl: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Giao dịch không tồn tại');
    if (payment.status !== 'PENDING')
      throw AppError.badRequest('Chỉ có thể tải chứng từ cho giao dịch đang chờ', 'INVALID_STATUS');
    await paymentRepository.uploadProof(paymentId, proofUrl);
    return { paymentId, proofUrl };
  },

  /** M9 #3 – Nhân viên đối soát chứng từ: SUCCESS hoặc FAILED. */
  async reviewProof(user: AuthUser, paymentId: number, status: 'SUCCESS' | 'FAILED', note: string) {
    const payment = await paymentRepository.findById(paymentId);
    if (!payment) throw AppError.notFound('Giao dịch không tồn tại');
    if (payment.status !== 'PENDING')
      throw AppError.badRequest('Giao dịch không ở trạng thái chờ đối soát', 'INVALID_STATUS');
    if (status === 'FAILED' && !note.trim())
      throw AppError.badRequest('Vui lòng nhập lý do từ chối', 'REASON_REQUIRED');
    await paymentRepository.review(paymentId, status, note);
    return { paymentId, status };
  },

  /** M9 #4/#5 – Webhook từ ngân hàng/MoMo xác nhận giao dịch (idempotent). */
  async handleWebhook(id: number, transactionCode: string, amountFromGateway: number) {
    return withTransaction(async (tx) => {
      let payment = await paymentRepository.findById(id, tx);
      if (!payment) {
        // Fallback: nếu webhook gửi id là invoiceId (hoặc orderId)
        payment = await paymentRepository.findActiveByInvoice(id, tx);
      }
      if (!payment) throw AppError.notFound('Giao dịch không tồn tại');

      // Idempotent: đã SUCCESS thì bỏ qua
      if (payment.status === 'SUCCESS') return { skipped: true };

      // Đối chiếu số tiền
      if (Math.abs(Number(amountFromGateway) - Number(payment.amount)) > 1) {
        throw AppError.badRequest(
          `Số tiền không khớp: cổng gửi ${amountFromGateway}, đơn yêu cầu ${payment.amount}`,
          'AMOUNT_MISMATCH',
        );
      }

      await paymentRepository.markSuccess(payment.paymentId, transactionCode, tx);
      return { paymentId: payment.paymentId, status: 'SUCCESS', transactionCode };
    });
  },

  /** M9 #7 – Khách thanh toán lại sau khi FAILED: tạo giao dịch PENDING mới. */
  async retryPay(user: AuthUser, invoiceId: number, methodCode: string) {
    return withTransaction(async (tx) => {
      // Kiểm tra giao dịch hiện tại: phải FAILED (nếu còn PENDING thì không cho tạo mới)
      const current = await paymentRepository.findActiveByInvoice(invoiceId, tx);
      if (current?.status === 'PENDING')
        throw AppError.conflict('Đang có giao dịch đang chờ xử lý', 'PENDING_EXISTS');
      if (current?.status === 'SUCCESS')
        throw AppError.conflict('Đơn hàng đã được thanh toán thành công', 'ALREADY_PAID');

      // Lấy hình thức thanh toán
      const methods = await paymentMethodRepository.listActive(tx);
      const method = methods.find((m) => m.methodCode === methodCode);
      if (!method) throw AppError.badRequest('Hình thức thanh toán không hợp lệ hoặc đã tắt', 'INVALID_METHOD');

      // Lấy số tiền từ hóa đơn
      const r = await query<{ amountPayable: number }>(
        `SELECT amount_payable AS amountPayable FROM invoices WHERE invoice_id = @invoiceId AND is_deleted = 0`,
        { invoiceId: [sql.Int, invoiceId] },
        tx,
      );
      const invoice = r.recordset[0];
      if (!invoice) throw AppError.notFound('Hóa đơn không tồn tại');

      const paymentId = await paymentRepository.createPending(invoiceId, method.methodId, invoice.amountPayable, tx);
      return { paymentId, invoiceId, amount: invoice.amountPayable, method: methodCode, status: 'PENDING' };
    });
  },

  // ─── Refunds ────────────────────────────────────────────────────────────────

  /** M9 #9 – Nhân viên/Admin: tạo yêu cầu hoàn tiền (PENDING). */
  async createRefund(user: AuthUser, paymentId: number, amount: number, reason: string) {
    return withTransaction(async (tx) => {
      const payment = await paymentRepository.findById(paymentId, tx);
      if (!payment) throw AppError.notFound('Giao dịch không tồn tại');
      if (payment.status !== 'SUCCESS')
        throw AppError.badRequest('Chỉ hoàn tiền cho giao dịch đã thu thành công', 'NOT_SUCCESS');

      // Kiểm tra tổng hoàn không vượt số đã thu
      const refunded = await refundRepository.sumSuccessByPayment(paymentId, tx);
      if (refunded + amount > Number(payment.amount)) {
        throw AppError.badRequest(
          `Tổng hoàn (${refunded + amount}) vượt số đã thu (${payment.amount})`,
          'REFUND_EXCEEDS',
        );
      }

      const refundId = await refundRepository.create({ paymentId, amount, reason }, tx);
      return { refundId, paymentId, amount, reason, status: 'PENDING' };
    });
  },

  /** M9 #9 – Nhân viên/Admin: xác nhận đã hoàn tiền xong (PENDING → SUCCESS). */
  async completeRefund(user: AuthUser, refundId: number, transactionCode: string) {
    const refund = await refundRepository.findById(refundId);
    if (!refund) throw AppError.notFound('Yêu cầu hoàn tiền không tồn tại');
    if (refund.status !== 'PENDING')
      throw AppError.badRequest('Yêu cầu hoàn tiền không ở trạng thái chờ', 'INVALID_STATUS');

    const processedBy = user.employeeId!;
    await refundRepository.complete(refundId, transactionCode, processedBy);

    // Tích hợp M13: Thông báo khi hoàn tiền thành công
    try {
      const info = await query<{ customerId: number; invoiceId: number }>(
        `SELECT i.customer_id AS customerId, i.invoice_id AS invoiceId
         FROM refunds r
         JOIN payments p ON p.payment_id = r.payment_id
         JOIN invoices i ON i.invoice_id = p.invoice_id
         WHERE r.refund_id = @refundId`,
        { refundId: [sql.Int, refundId] },
      );
      if (info.recordset[0]?.customerId) {
        await notificationRepository.createForCustomer({
          title: `Hoàn tiền thành công cho đơn hàng #${info.recordset[0].invoiceId}`,
          content: `Yêu cầu hoàn tiền số tiền ${Number(refund.amount).toLocaleString('vi-VN')} đ cho đơn hàng #${info.recordset[0].invoiceId} đã được xử lý thành công. Mã giao dịch: ${transactionCode}`,
          notificationType: 'ORDER',
          linkUrl: `/orders/${info.recordset[0].invoiceId}`,
          customerId: info.recordset[0].customerId,
          createdByEmployeeId: processedBy,
        });
      }
    } catch {}

    return { refundId, status: 'SUCCESS', transactionCode };
  },

  /** Admin: từ chối yêu cầu hoàn tiền. */
  async rejectRefund(user: AuthUser, refundId: number, reason: string) {
    const refund = await refundRepository.findById(refundId);
    if (!refund) throw AppError.notFound('Yêu cầu hoàn tiền không tồn tại');
    if (refund.status !== 'PENDING')
      throw AppError.badRequest('Yêu cầu hoàn tiền không ở trạng thái chờ', 'INVALID_STATUS');

    const processedBy = user.employeeId!;
    await refundRepository.reject(refundId, reason, processedBy);
    return { refundId, status: 'REJECTED' };
  },

  /** Job định kỳ: đánh dấu PENDING quá hạn → FAILED (gọi từ cron/timer). */
  async expirePendingPayments(thresholdMinutes = 30) {
    const count = await paymentRepository.expirePending(thresholdMinutes);
    return { expired: count };
  },
};
