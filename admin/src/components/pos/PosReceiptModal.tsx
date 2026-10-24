import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import type { PosOrderResult } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatVnd } from '../../utils/format';
import { openPrintWindow } from '../../utils/order';
import { Modal } from '../common/Modal';
import { PaymentBadge } from '../invoices/InvoiceBadges';

interface Props {
  order: PosOrderResult;
  /** Đường dẫn chi tiết đơn của vai trò hiện tại (vd. /admin/orders). */
  ordersPath: string;
  onNewSale: () => void;
}

/** Hóa đơn vừa lập sau khi thanh toán thành công: xem nhanh, in, mở chi tiết hoặc bắt đầu đơn mới. */
export function PosReceiptModal({ order, ordersPath, onNewSale }: Props) {
  const paid = order.payments.filter((p) => p.status === 'SUCCESS');

  async function print() {
    try {
      openPrintWindow(await orderService.printHtml(order.invoiceId, 'invoice'));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <Modal title={`Thanh toán thành công · Hóa đơn #${order.invoiceId}`} onClose={onNewSale} wide>
      <p className="muted" style={{ marginTop: 0 }}>
        {formatDateTime(order.invoiceDate)} · Nhân viên: {order.employeeName ?? '—'} · Khách: {order.customerName ?? 'Khách lẻ'}
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Giảm</th><th className="num">Thành tiền</th></tr></thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.variantId}>
                <td>{i.productName}<br /><span className="muted">{i.sku} · Size {i.sizeLabel} · {i.colorName}</span></td>
                <td className="num">{i.quantity}</td>
                <td className="num">{formatVnd(i.salePrice)}</td>
                <td className="num">{formatVnd(i.discountAmount)}</td>
                <td className="num">{formatVnd(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="totals-box">
        <dt>Tổng tiền hàng</dt><dd>{formatVnd(order.totalAmount)}</dd>
        <dt>Giảm giá hóa đơn</dt><dd>-{formatVnd(order.discountAmount)}</dd>
        <dt className="grand">Đã thanh toán</dt><dd className="grand">{formatVnd(order.amountPayable)}</dd>
        {paid.map((p) => (<Fragment key={p.paymentId}><dt>Phương thức</dt><dd>{p.methodName}</dd></Fragment>))}
        {order.change !== null && (<><dt>Tiền thừa trả khách</dt><dd><strong>{formatVnd(order.change)}</strong></dd></>)}
        <dt>Trạng thái</dt><dd><PaymentBadge status={order.paymentStatus} /></dd>
      </dl>
      <div className="form__actions" style={{ marginTop: 16 }}>
        <Link to={`${ordersPath}/${order.invoiceId}`} className="btn btn--ghost">Xem chi tiết</Link>
        <button type="button" className="btn btn--ghost" onClick={print}>In hóa đơn</button>
        <button type="button" className="btn btn--primary" onClick={onNewSale}>Đơn mới</button>
      </div>
    </Modal>
  );
}
