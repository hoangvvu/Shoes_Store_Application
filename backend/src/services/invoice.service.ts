import { ROLES } from '../constants/auth.constant';
import { isInvoice } from '../constants/order.constant';
import { AppError } from '../errors/AppError';
import { orderRepository } from '../repositories/order.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import type { InvoiceListQuery } from '../validators/order.validator';
import { orderService } from './order.service';

const NOT_FOUND = () => AppError.notFound('Không tìm thấy hóa đơn', 'INVOICE_NOT_FOUND');

/**
 * Quản lý hóa đơn (M8): các đơn ĐÃ HOÀN THÀNH + ĐÃ THANH TOÁN, và các đơn ĐÃ HOÀN TIỀN (một phần hoặc toàn bộ,
 * kể cả đơn đã hủy sau khi thu tiền) để không bỏ sót. Đơn đang xử lý / chưa thu đủ tiền vẫn ở màn "Đơn hàng".
 */
export const invoiceService = {
  async list(auth: AuthUser, q: InvoiceListQuery) {
    const { rows, total, summary } = await orderRepository.list({
      invoice: q.type ?? 'ANY',
      channel: q.channel,
      from: q.from,
      to: q.to,
      q: q.q,
      page: q.page,
      size: q.size,
    });
    // Thống kê doanh thu chỉ dành cho Admin
    return { ...toPaged(rows, total, q.page, q.size), summary: auth.role === ROLES.ADMIN ? summary : undefined };
  },

  /** Chi tiết hóa đơn: đơn không đủ điều kiện là hóa đơn thì trả 404 (đơn đó xem ở màn Đơn hàng). */
  async get(auth: AuthUser, id: number) {
    const order = await orderService.getOrder(auth, id);
    if (!isInvoice(order.orderStatus, order.paymentStatus)) throw NOT_FOUND();
    if (auth.role !== ROLES.ADMIN) {
      // Nhân viên bán hàng: thấy số tiền hoàn nhưng không thấy người xử lý hoàn tiền
      return { ...order, refunds: order.refunds.map((r) => ({ ...r, processedByName: null })) };
    }
    return order;
  },

  async renderPrint(auth: AuthUser, id: number) {
    await this.get(auth, id);
    return orderService.renderPrint(auth, id, 'invoice');
  },
};
