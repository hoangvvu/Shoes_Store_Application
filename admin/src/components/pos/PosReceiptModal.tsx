import { Link } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import type { PosOrderResult } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatVnd } from '../../utils/format';
import { openPrintWindow } from '../../utils/order';
import { Modal } from '../common/Modal';
import { PaymentBadge } from '../invoices/InvoiceBadges';
import { AmountSummary } from './AmountSummary';

interface Props {
  order: PosOrderResult;
  /** Đường dẫn chi tiết đơn của vai trò hiện tại (vd. /admin/orders). */
  ordersPath: string;
  onNewSale: () => void;
}

/** Hóa đơn vừa lập sau khi thanh toán thành công: xem nhanh, in, mở chi tiết hoặc bắt đầu đơn mới. */
export function PosReceiptModal({ order, ordersPath, onNewSale }: Props) {
  const paid = order.payments.filter((p) => p.status === 'SUCCESS');
  const gross = order.items.reduce((s, i) => s + i.salePrice * i.quantity, 0);
  const productDiscount = order.items.reduce((s, i) => s + i.discountAmount, 0);
  const invoicePct = order.totalAmount > 0 ? Math.round((order.discountAmount * 1000) / order.totalAmount) / 10 : 0;
  const invoiceNote = order.discountAmount > 0
    ? `${invoicePct}% trên tổng tiền hàng sau giảm sản phẩm${order.voucherCode ? ` · Voucher ${order.voucherCode}` : order.promotionName ? ` · ${order.promotionName}` : ''}`
    : 'Không có giảm giá theo hóa đơn';

  async function print() {
    try {
      openPrintWindow(await orderService.printHtml(order.invoiceId, 'invoice'));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <Modal title={`Thanh toán thành công · Hóa đơn #${order.invoiceId}`} onClose={onNewSale} wide>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th>
              <th className="num" title="Khuyến mãi theo sản phẩm, tính cho cả dòng">Giảm giá SP (cả dòng)</th><th className="num">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.variantId}>
                <td>{i.productName}<br /><span className="muted">{i.sku} · Size {i.sizeLabel} · {i.colorName}</span></td>
                <td className="num">{i.quantity}</td>
                <td className="num">{formatVnd(i.salePrice)}</td>
                <td className="num">{i.discountAmount > 0 ? `-${formatVnd(i.discountAmount)}` : '—'}</td>
                <td className="num">{formatVnd(i.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pos-pay" style={{ marginTop: 16 }}>
        <div className="pos-pay__left">
          <dl className="kv">
            <dt>Thanh toán</dt><dd><PaymentBadge status={order.paymentStatus} /></dd>
            {paid.map((p) => (
              <span key={p.paymentId} style={{ display: 'contents' }}>
                <dt>Phương thức</dt><dd>{p.methodName}</dd>
                {p.transactionCode && (<><dt>Mã giao dịch</dt><dd>{p.transactionCode}</dd></>)}
              </span>
            ))}
            <dt>Thu ngân</dt><dd>{order.employeeName ?? '—'}</dd>
            <dt>Khách hàng</dt><dd>{order.customerName ?? 'Khách lẻ'}</dd>
            <dt>Thời gian</dt><dd>{formatDateTime(order.invoiceDate)}</dd>
            {order.note && (<><dt>Ghi chú</dt><dd>{order.note}</dd></>)}
          </dl>
        </div>
        <div className="pos-pay__right">
          <AmountSummary
            gross={gross}
            productDiscount={productDiscount}
            invoiceDiscount={order.discountAmount}
            invoiceDiscountNote={invoiceNote}
            payable={order.amountPayable}
            payableLabel="Đã thanh toán"
            extra={order.change !== null ? [
              { label: 'Tiền khách đưa', value: formatVnd(order.amountPayable + order.change) },
              { label: 'Tiền thừa trả khách', value: formatVnd(order.change), tone: 'strong' },
            ] : undefined}
          />
        </div>
      </div>

      <div className="form__actions" style={{ marginTop: 16 }}>
        <Link to={`${ordersPath}/${order.invoiceId}`} className="btn btn--ghost">Xem chi tiết</Link>
        <button type="button" className="btn btn--ghost" onClick={print}>In hóa đơn</button>
        <button type="button" className="btn btn--primary" onClick={onNewSale}>Đơn mới</button>
      </div>
    </Modal>
  );
}
