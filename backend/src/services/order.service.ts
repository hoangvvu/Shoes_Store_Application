import { withTransaction } from '../config/database';
import { ROLES } from '../constants/auth.constant';
import { CANCELLABLE, ORDER_STATUS_LABEL, type OrderStatus } from '../constants/order.constant';
import { AppError } from '../errors/AppError';
import { addressRepository } from '../repositories/address.repository';
import { cartRepository } from '../repositories/cart.repository';
import { orderRepository } from '../repositories/order.repository';
import { orderPaymentRepository } from '../repositories/orderPayment.repository';
import { orderPromotionRepository } from '../repositories/orderPromotion.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { CreateOrderInput, LineInput, MyOrdersQuery, OrderListQuery, PosOrderInput } from '../validators/order.validator';
import { cartService } from './cart.service';
import { renderOrderHtml } from './orderPrint.service';
import { VOUCHER_MESSAGE, computeInvoiceDiscount, priceLines, type PricedLine } from './pricing.service';

const NOT_FOUND = () => AppError.notFound('Không tìm thấy đơn hàng', 'ORDER_NOT_FOUND');
const isStaff = (a: AuthUser) => a.role === ROLES.ADMIN || a.role === ROLES.SALES;

function customerIdOf(auth: AuthUser): number {
  if (!auth.customerId) throw AppError.forbidden();
  return auth.customerId;
}

const joinAddress = (a: { streetDetail: string; ward: string; district: string; province: string }) =>
  [a.streetDetail, a.ward, a.district, a.province].filter(Boolean).join(', ');

const stateError = (status: OrderStatus, action: string) =>
  AppError.conflict(`Đơn đang ở trạng thái "${ORDER_STATUS_LABEL[status]}", không thể ${action}`, 'INVALID_ORDER_STATE');

/** Ghi các dòng chi tiết + giảm giá hóa đơn theo đúng thứ tự: chi tiết trước, giảm giá hóa đơn sau. */
async function writeLinesAndDiscount(
  tx: Parameters<typeof orderRepository.insertDetail>[2],
  invoiceId: number,
  priced: PricedLine[],
  voucherCode: string | undefined,
  { strictVoucher }: { strictVoucher: boolean },
) {
  for (const l of priced) {
    await orderRepository.insertDetail(
      invoiceId,
      { variantId: l.variantId, quantity: l.quantity, salePrice: l.unitPrice, discountAmount: l.lineDiscount },
      tx,
    ); // trigger tự cộng total_amount
  }
  const total = await orderRepository.getTotal(invoiceId, tx);
  const disc = await computeInvoiceDiscount(total, voucherCode, tx);
  if (strictVoucher && voucherCode && (disc.voucherStatus === 'NOT_FOUND' || disc.voucherStatus === 'EXHAUSTED')) {
    throw AppError.badRequest(VOUCHER_MESSAGE[disc.voucherStatus], 'VOUCHER_INVALID');
  }
  if (disc.voucherCode && !(await orderPromotionRepository.consumeVoucher(disc.voucherCode, tx))) {
    throw AppError.conflict(VOUCHER_MESSAGE.EXHAUSTED, 'VOUCHER_EXHAUSTED'); // vừa có người dùng hết lượt
  }
  await orderRepository.setInvoiceDiscount(
    invoiceId,
    { discountAmount: disc.amount, promotionId: disc.promotionId, voucherCode: disc.voucherCode },
    tx,
  );
  return { total, discount: disc, payable: total - disc.amount };
}

export const orderService = {
  /* ===================== KHÁCH ===================== */

  /** Xem trước: tính giá, khuyến mãi, voucher từ giỏ hiện tại, không ghi gì vào CSDL. */
  async preview(auth: AuthUser, voucherCode?: string) {
    const customerId = customerIdOf(auth);
    const cartId = await cartRepository.findActiveCartId(customerId);
    const cartItems = cartId ? await cartRepository.listItems(cartId) : [];
    const usable = cartItems.filter((i) => i.availability !== 'UNAVAILABLE');
    const { priced } = await priceLines(usable.map((i) => ({ variantId: i.variantId, quantity: i.quantity })));

    const total = priced.reduce((s, l) => s + l.lineTotal, 0);
    const disc = await computeInvoiceDiscount(total, voucherCode);
    const issues = [
      ...cartItems.filter((i) => i.availability === 'UNAVAILABLE').map((i) => ({ variantId: i.variantId, productName: i.productName, availability: i.availability, message: 'Sản phẩm không còn kinh doanh, sẽ bị bỏ khỏi đơn' })),
      ...priced
        .filter((l) => l.stockQuantity < l.quantity)
        .map((l) => ({ variantId: l.variantId, productName: l.productName, availability: l.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'INSUFFICIENT_STOCK', message: l.stockQuantity === 0 ? 'Sản phẩm đã hết hàng' : `Kho chỉ còn ${l.stockQuantity} sản phẩm` })),
    ];
    return {
      items: priced.map((l) => ({
        variantId: l.variantId, productId: l.productId, productName: l.productName, imageUrl: l.imageUrl, sku: l.sku,
        sizeLabel: l.sizeLabel, colorName: l.colorName, quantity: l.quantity, unitPrice: l.unitPrice,
        discountPercent: l.discountPercent, lineDiscount: l.lineDiscount, lineTotal: l.lineTotal,
      })),
      totalAmount: total,
      invoiceDiscountPercent: disc.percent,
      invoiceDiscountSource: disc.source,
      discountAmount: disc.amount,
      amountPayable: total - disc.amount,
      voucher: voucherCode ? { code: voucherCode, status: disc.voucherStatus, message: VOUCHER_MESSAGE[disc.voucherStatus] } : null,
      issues,
      canPlaceOrder: priced.length > 0 && issues.every((i) => i.availability === 'UNAVAILABLE'),
    };
  },

  /** Đặt hàng online: 1 transaction duy nhất. Lỗi ở bước nào cũng ROLLBACK toàn bộ. */
  async create(auth: AuthUser, input: CreateOrderInput) {
    const customerId = customerIdOf(auth);
    const orderId = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);

      const cartId = await orderRepository.lockActiveCartId(customerId, tx); // gửi lặp: lần 2 không còn giỏ ACTIVE
      if (!cartId) throw AppError.badRequest('Giỏ hàng đang trống', 'CART_EMPTY');
      const cartItems = await cartRepository.listItems(cartId, tx);
      const usable = cartItems.filter((i) => i.availability !== 'UNAVAILABLE'); // bỏ sản phẩm ngừng bán
      if (!usable.length) throw AppError.badRequest('Giỏ hàng không có sản phẩm hợp lệ', 'CART_EMPTY');

      const short = usable.filter((i) => i.availability !== 'OK'); // kiểm tồn (chưa trừ kho, kho trừ khi xác nhận)
      if (short.length) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Một số sản phẩm không đủ hàng', short.map((i) => ({
          variantId: i.variantId, productName: i.productName, quantity: i.quantity, stockQuantity: i.stockQuantity,
        })));
      }

      const addr = await addressRepository.findOwned(input.addressId, customerId, tx); // chống IDOR
      if (!addr) throw AppError.notFound('Địa chỉ giao hàng không tồn tại', 'ADDRESS_NOT_FOUND');
      const method = await orderPaymentRepository.findMethod(input.methodCode, tx);
      if (!method) throw AppError.badRequest('Phương thức thanh toán không hợp lệ', 'PAYMENT_METHOD_INVALID');

      const { priced, unavailable } = await priceLines(usable.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), tx);
      if (unavailable.length) throw AppError.conflict('Một số sản phẩm vừa ngừng kinh doanh, vui lòng kiểm tra lại giỏ', 'CART_CHANGED');

      const invoiceId = await orderRepository.insertInvoice(
        {
          channel: 'ONLINE', customerId, addressId: addr.addressId,
          receiverName: addr.receiverName, receiverPhone: addr.receiverPhone, shippingAddress: joinAddress(addr), // chụp lại địa chỉ
          note: input.note ?? null,
        },
        tx,
      );
      const { payable } = await writeLinesAndDiscount(tx, invoiceId, priced, input.voucherCode, { strictVoucher: true });
      if (payable > 0) await orderPaymentRepository.createPending(invoiceId, method.methodId, payable, tx);
      await cartRepository.markCheckedOut(cartId, tx);
      return invoiceId;
    });
    return this.getOrder(auth, orderId);
  },

  async listMine(auth: AuthUser, q: MyOrdersQuery) {
    const { rows, total } = await orderRepository.list({ customerId: customerIdOf(auth), status: q.status, page: q.page, size: q.size });
    return toPaged(rows, total, q.page, q.size);
  },

  /** Mua lại: thêm sản phẩm của đơn cũ vào giỏ (chỉ còn bán và còn hàng; số lượng giảm xuống bằng tồn nếu thiếu). */
  async reorder(auth: AuthUser, invoiceId: number) {
    const customerId = customerIdOf(auth);
    const order = await orderRepository.findOrder(invoiceId);
    if (!order || order.customerId !== customerId) throw NOT_FOUND();

    const lines = await orderRepository.listLines(invoiceId);
    const variants = await orderRepository.getSaleVariants(lines.map((l) => l.variantId));
    const byId = new Map(variants.map((v) => [v.variantId, v]));

    const added: { variantId: number; productName: string; quantity: number; requested: number }[] = [];
    const skipped: { variantId: number; productName: string; reason: string }[] = [];
    for (const l of lines) {
      const v = byId.get(l.variantId);
      if (!v || !v.sellable) skipped.push({ variantId: l.variantId, productName: l.productName, reason: 'Sản phẩm không còn kinh doanh' });
      else if (v.stockQuantity <= 0) skipped.push({ variantId: l.variantId, productName: l.productName, reason: 'Sản phẩm đã hết hàng' });
      else added.push({ variantId: l.variantId, productName: l.productName, quantity: Math.min(l.quantity, v.stockQuantity), requested: l.quantity });
    }

    if (added.length) {
      const run = () =>
        withTransaction(async (tx) => {
          await setActor(tx, auth.userId);
          const cartId = (await cartRepository.findActiveCartId(customerId, tx)) ?? (await cartRepository.createCart(customerId, tx));
          for (const a of added) await cartRepository.upsertItem(cartId, a.variantId, a.quantity, tx);
          await cartRepository.touch(cartId, tx);
        });
      try {
        await run();
      } catch (err) {
        if (!isDuplicateKey(err, 'uq_cart_active')) throw err;
        await run(); // 2 request cùng tạo giỏ: thử lại 1 lần
      }
    }
    return { added, skipped, cart: await cartService.getCart(auth) };
  },

  /* ===================== CHUNG (khách / nhân viên) ===================== */

  /** Chi tiết đơn + timeline lịch sử trạng thái. Khách chỉ xem đơn của mình (đơn người khác trả 404). */
  async getOrder(auth: AuthUser, invoiceId: number) {
    const order = await orderRepository.findOrder(invoiceId);
    if (!order) throw NOT_FOUND();
    if (auth.role === ROLES.CUSTOMER && order.customerId !== auth.customerId) throw NOT_FOUND();
    if (auth.role !== ROLES.CUSTOMER && !isStaff(auth)) throw AppError.forbidden();

    const [items, history, payments] = await Promise.all([
      orderRepository.listLines(invoiceId),
      orderRepository.listHistory(invoiceId),
      orderPaymentRepository.listByInvoice(invoiceId),
    ]);
    const isCustomer = auth.role === ROLES.CUSTOMER;
    return {
      ...order,
      employeeName: isCustomer ? null : order.employeeName,
      employeeId: isCustomer ? null : order.employeeId,
      items,
      history,
      payments,
      canCancel: isCustomer ? order.orderStatus === 'PENDING' : CANCELLABLE.includes(order.orderStatus),
      canEdit: !isCustomer && order.orderStatus === 'PENDING',
    };
  },

  /** Khách: chỉ hủy khi PENDING. Nhân viên/Admin: bắt buộc lý do; hoàn kho nếu đã trừ; hoàn lượt voucher. */
  async cancel(auth: AuthUser, invoiceId: number, reason?: string) {
    const customer = auth.role === ROLES.CUSTOMER;
    if (!customer && !reason?.trim()) throw AppError.badRequest('Bắt buộc nhập lý do hủy đơn', 'REASON_REQUIRED');

    const { paidAmount } = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const row = await orderRepository.lock(invoiceId, tx);
      if (!row || (customer && row.customerId !== auth.customerId)) throw NOT_FOUND();

      if (customer && row.orderStatus !== 'PENDING') {
        throw AppError.conflict('Đơn đã được cửa hàng xử lý, vui lòng liên hệ cửa hàng để hủy đơn', 'ORDER_NOT_CANCELLABLE');
      }
      if (!CANCELLABLE.includes(row.orderStatus)) throw stateError(row.orderStatus, 'hủy');

      // sp: UPDATE + lịch sử + hoàn kho (nếu stock_deducted = 1) + audit ORDER_CANCEL do trigger
      await orderRepository.changeStatus(
        { invoiceId, newStatus: 'CANCELLED', userId: auth.userId, note: reason?.trim() || 'Khách tự hủy đơn' },
        tx,
      );
      await setActor(tx, auth.userId);
      if (row.voucherCode) await orderPromotionRepository.releaseVoucher(row.voucherCode, tx); // hoàn lượt voucher
      await orderPaymentRepository.failPending(invoiceId, 'Đơn hàng đã bị hủy', tx);
      return { paidAmount: await orderRepository.paidAmount(invoiceId, tx) };
    });

    // Đã thu tiền: việc tạo yêu cầu hoàn tiền thuộc M9, ở đây chỉ báo để giao diện nhắc nhân viên.
    return { ...(await this.getOrder(auth, invoiceId)), refundRequired: paidAmount > 0, paidAmount };
  },

  /* ===================== NHÂN VIÊN / ADMIN ===================== */

  async list(q: OrderListQuery) {
    const { rows, total } = await orderRepository.list(q);
    return toPaged(rows, total, q.page, q.size);
  },

  confirm(auth: AuthUser, id: number, note?: string) {
    return this.transition(auth, id, 'PENDING', 'CONFIRMED', 'xác nhận', note); // trừ kho (SALE) do trigger
  },
  ship(auth: AuthUser, id: number, note?: string) {
    return this.transition(auth, id, 'CONFIRMED', 'SHIPPING', 'bàn giao vận chuyển', note);
  },
  deliver(auth: AuthUser, id: number, note?: string) {
    return this.transition(auth, id, 'SHIPPING', 'DELIVERED', 'xác nhận đã giao', note, true);
  },

  /** Mỗi lần đổi trạng thái đi qua sp_change_order_status; gửi lặp lần 2 → lỗi 51070, không trừ kho trùng. */
  async transition(auth: AuthUser, id: number, from: OrderStatus, to: OrderStatus, action: string, note?: string, addPurchased = false) {
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const row = await orderRepository.lock(id, tx);
      if (!row) throw NOT_FOUND();
      if (row.orderStatus !== from) throw stateError(row.orderStatus, action);

      await orderRepository.changeStatus({ invoiceId: id, newStatus: to, userId: auth.userId, note: note ?? null }, tx);
      if (addPurchased && row.customerId) {
        await orderRepository.addTotalPurchased(row.customerId, row.amountPayable, tx); // cộng total_purchased
      }
    });
    return this.getOrder(auth, id);
  },

  /** Sửa chi tiết khi còn PENDING: tính lại giá/khuyến mãi/giảm giá hóa đơn và số tiền giao dịch đang chờ. */
  async editItems(auth: AuthUser, id: number, lines: LineInput[]) {
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const row = await orderRepository.lock(id, tx);
      if (!row) throw NOT_FOUND();
      if (row.orderStatus !== 'PENDING') {
        throw AppError.conflict('Chỉ sửa được đơn đang chờ xác nhận (sau xác nhận CSDL chặn sửa chi tiết)', 'ORDER_NOT_EDITABLE');
      }

      const { priced, unavailable } = await priceLines(lines, tx);
      if (unavailable.length) {
        throw new AppError(400, 'VARIANT_UNAVAILABLE', 'Có sản phẩm không tồn tại hoặc đã ngừng kinh doanh', unavailable);
      }

      await orderRepository.clearInvoiceDiscountAmount(id, tx); // tránh vi phạm ck_inv_discount khi total tụt về 0
      await orderRepository.deleteDetails(id, tx);
      for (const l of priced) {
        await orderRepository.insertDetail(id, { variantId: l.variantId, quantity: l.quantity, salePrice: l.unitPrice, discountAmount: l.lineDiscount }, tx);
      }
      const total = await orderRepository.getTotal(id, tx);

      // Voucher đã giữ lượt: giữ nguyên nếu vẫn là mức giảm cao nhất, ngược lại hoàn lượt và dùng mức theo tổng tiền.
      const tier = await orderPromotionRepository.bestInvoiceTier(total, tx);
      const keep = row.voucherCode ? await orderPromotionRepository.findVoucherPercentAny(row.voucherCode, tx) : null;
      const tierPct = tier?.percent ?? 0;
      let percent = 0;
      let promotionId: number | null = null;
      let voucherCode: string | null = null;
      if (keep && keep.percent >= tierPct) {
        percent = keep.percent;
        promotionId = keep.promotionId;
        voucherCode = row.voucherCode;
      } else {
        if (row.voucherCode) await orderPromotionRepository.releaseVoucher(row.voucherCode, tx);
        if (tier) {
          percent = tier.percent;
          promotionId = tier.promotionId;
        }
      }
      const discountAmount = Math.round((total * percent) / 100);
      await orderRepository.setInvoiceDiscount(id, { discountAmount, promotionId, voucherCode }, tx);

      const payable = total - discountAmount;
      const paid = await orderRepository.paidAmount(id, tx);
      if (paid > payable) {
        throw AppError.conflict('Đơn đã thanh toán nhiều hơn tổng mới, cần hoàn tiền trước khi sửa', 'PAID_EXCEEDS_TOTAL');
      }
      await orderPaymentRepository.updatePendingAmount(id, payable - paid, tx);
    });
    return this.getOrder(auth, id);
  },

  /** Xóa mềm (Admin): chỉ PENDING hoặc CANCELLED; đơn đã trừ kho phải hủy trước. */
  async remove(auth: AuthUser, id: number) {
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const row = await orderRepository.lock(id, tx);
      if (!row) throw NOT_FOUND();
      if (row.orderStatus !== 'PENDING' && row.orderStatus !== 'CANCELLED') {
        throw AppError.conflict('Chỉ xóa được đơn đang chờ xác nhận hoặc đã hủy; đơn đã xử lý phải hủy trước', 'ORDER_NOT_DELETABLE');
      }
      if (row.stockDeducted) throw AppError.conflict('Đơn đã xuất kho: hãy hủy đơn (hoàn kho) trước khi xóa', 'ORDER_NOT_DELETABLE');
      if (row.orderStatus === 'PENDING') {
        if (row.voucherCode) await orderPromotionRepository.releaseVoucher(row.voucherCode, tx); // đơn CANCELLED đã hoàn lượt khi hủy
        await orderPaymentRepository.discardPending(id, tx);
      }
      await orderRepository.softDelete(id, tx);
    });
  },

  /** In hóa đơn / phiếu giao: trả HTML sẵn sàng in (Lưu dưới dạng PDF ở hộp thoại in). */
  async renderPrint(auth: AuthUser, id: number, type: 'invoice' | 'delivery') {
    const o = await this.getOrder(auth, id);
    return renderOrderHtml(o, type);
  },

  /* ===================== POS ===================== */

  /** Bán tại quầy: tạo đơn POS, thu tiền, rồi PENDING → DELIVERED (trừ kho) trong 1 transaction. */
  async createPos(auth: AuthUser, input: PosOrderInput) {
    if (!auth.employeeId) throw AppError.forbidden();
    const employeeId = auth.employeeId;
    let change: number | null = null;

    const invoiceId = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      if (input.customerId && !(await orderRepository.customerExists(input.customerId, tx))) {
        throw AppError.notFound('Không tìm thấy khách hàng', 'CUSTOMER_NOT_FOUND');
      }
      const method = await orderPaymentRepository.findMethod(input.methodCode, tx);
      if (!method) throw AppError.badRequest('Phương thức thanh toán không hợp lệ', 'PAYMENT_METHOD_INVALID');

      const { priced, unavailable } = await priceLines(input.items, tx);
      if (unavailable.length) throw new AppError(400, 'VARIANT_UNAVAILABLE', 'Có sản phẩm không tồn tại hoặc đã ngừng kinh doanh', unavailable);
      const short = priced.filter((l) => l.stockQuantity < l.quantity);
      if (short.length) {
        throw new AppError(409, 'INSUFFICIENT_STOCK', 'Một số sản phẩm không đủ hàng', short.map((l) => ({
          variantId: l.variantId, productName: l.productName, quantity: l.quantity, stockQuantity: l.stockQuantity,
        })));
      }

      const invoiceId = await orderRepository.insertInvoice(
        { channel: 'POS', employeeId, customerId: input.customerId ?? null, note: input.note ?? null },
        tx,
      );
      const { payable } = await writeLinesAndDiscount(tx, invoiceId, priced, input.voucherCode, { strictVoucher: true });

      if (input.amountReceived !== undefined) {
        if (input.amountReceived < payable) throw AppError.badRequest('Tiền khách đưa chưa đủ', 'AMOUNT_RECEIVED_TOO_LOW');
        change = input.amountReceived - payable;
      }
      if (payable > 0) await orderPaymentRepository.createSuccess(invoiceId, method.methodId, payable, tx);

      // Chuyển thẳng PENDING → DELIVERED (chỉ kênh POS được phép); trigger trừ kho, thiếu hàng thì ROLLBACK cả đơn
      await orderRepository.changeStatus({ invoiceId, newStatus: 'DELIVERED', userId: auth.userId, note: 'Bán tại quầy' }, tx);
      if (input.customerId) await orderRepository.addTotalPurchased(input.customerId, payable, tx);
      return invoiceId;
    });
    return { ...(await this.getOrder(auth, invoiceId)), change };
  },
};
