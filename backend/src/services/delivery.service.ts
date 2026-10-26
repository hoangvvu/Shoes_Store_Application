import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { deliveryRepository } from '../repositories/delivery.repository';
import { orderRepository } from '../repositories/order.repository';
import { orderPaymentRepository } from '../repositories/orderPayment.repository';
import { paymentRepository } from '../repositories/payment.repository';
import type { AuthUser } from '../types/express';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { ConfirmDeliveryPaymentInput } from '../validators/delivery.validator';
import { orderService } from './order.service';

const NOT_FOUND = () => AppError.notFound('Không tìm thấy đơn hàng', 'ORDER_NOT_FOUND');

export const deliveryService = {
  async listShipping() {
    const items = await deliveryRepository.listShipping();
    return { items, total: items.length };
  },

  async getDetail(invoiceId: number) {
    const order = await deliveryRepository.findOrder(invoiceId);
    if (!order) throw NOT_FOUND();
    const [items, payments, shippingNote] = await Promise.all([
      deliveryRepository.listLines(invoiceId),
      paymentRepository.listByInvoice(invoiceId),
      deliveryRepository.findShippingNote(invoiceId),
    ]);
    // order.note = ghi chú của khách khi đặt hàng; shippingNote = ghi chú quản trị viên khi bàn giao vận chuyển
    return { ...order, items, payments, shippingNote };
  },

  /**
   * Người giao xác nhận ĐÃ THU TIỀN và thu bằng hình thức nào. Hình thức thực tế được ghi đè vào giao dịch
   * nên màn Đơn hàng / Hóa đơn hiển thị đúng "Tiền mặt" hay "Chuyển khoản QR" (không còn luôn là tiền mặt).
   */
  async confirmPayment(actor: AuthUser, invoiceId: number, paymentId: number, input: ConfirmDeliveryPaymentInput) {
    try {
      await withTransaction(async (tx) => {
        await setActor(tx, actor.userId);
        const order = await orderRepository.lock(invoiceId, tx);
        if (!order) throw NOT_FOUND();
        if (order.orderStatus !== 'SHIPPING') {
          throw AppError.conflict('Chỉ thu tiền cho đơn đang giao', 'INVALID_ORDER_STATE');
        }

        const payment = await paymentRepository.findById(paymentId, tx);
        if (!payment || payment.invoiceId !== invoiceId) {
          throw AppError.notFound('Giao dịch không thuộc đơn hàng này', 'PAYMENT_NOT_FOUND');
        }
        if (payment.status !== 'PENDING') {
          throw AppError.conflict('Giao dịch đã được xử lý trước đó', 'PAYMENT_NOT_PENDING');
        }

        const method = await orderPaymentRepository.findMethod(input.methodCode, tx);
        if (!method) throw AppError.badRequest('Hình thức thanh toán không hợp lệ hoặc đã tắt', 'PAYMENT_METHOD_INVALID');

        // Tiền mặt không có mã giao dịch; chuyển khoản/QR/ví luôn có mã (do người giao nhập hoặc hệ thống sinh)
        const txnCode =
          method.methodCode === 'CASH' ? null : (input.transactionCode ?? `DLV-${invoiceId}-${Date.now()}`);

        const affected = await deliveryRepository.settlePayment(paymentId, invoiceId, method.methodId, txnCode, tx);
        if (affected === 0) throw AppError.conflict('Giao dịch đã được xử lý trước đó', 'PAYMENT_NOT_PENDING');
      });
    } catch (err) {
      if (isDuplicateKey(err, 'uq_payments_txn')) {
        throw AppError.conflict('Mã giao dịch này đã được dùng cho một thanh toán khác', 'TRANSACTION_CODE_DUPLICATE');
      }
      throw err;
    }
    return this.getDetail(invoiceId);
  },

  /** SHIPPING -> DELIVERED qua orderService.deliver (sp_change_order_status), rồi ghi người giao. */
  async deliver(actor: AuthUser, invoiceId: number) {
    const order = await deliveryRepository.findOrder(invoiceId);
    if (!order) throw NOT_FOUND();
    const paid = await orderRepository.paidAmount(invoiceId);
    if (paid < order.amountPayable) {
      throw AppError.conflict('Đơn chưa thu đủ tiền, hãy xác nhận thu tiền trước khi hoàn tất giao hàng', 'ORDER_NOT_PAID');
    }

    await orderService.deliver(actor, invoiceId, 'Nhân viên xác nhận giao hàng thành công trên Mobile');
    if (actor.employeeId) await deliveryRepository.setShipper(invoiceId, actor.employeeId);
    return { message: 'Xác nhận giao hàng thành công' };
  },
};
