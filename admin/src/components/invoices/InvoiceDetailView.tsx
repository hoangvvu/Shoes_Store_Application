import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_TX_LABEL, REFUND_STATUS_LABEL, openPrintWindow } from '../../utils/order';
import { PageHeader } from '../common/PageHeader';
import { CompletionBadge, PaymentBadge } from './InvoiceBadges';

/** Chi tiết hóa đơn: thông tin chung, sản phẩm, thanh toán, hoàn tiền và lịch sử trạng thái. */
export function InvoiceDetailView({ basePath, ordersPath }: { basePath: string; ordersPath: string }) {
  const { id } = useParams();
  const invoiceId = Number(id);
  const [inv, setInv] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setInv(await invoiceService.get(invoiceId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function print() {
    try {
      openPrintWindow(await invoiceService.printHtml(invoiceId));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  if (error) return (<><p className="form-error">{error}</p><Link to={basePath} className="link">← Quay lại danh sách hóa đơn</Link></>);
  if (!inv) return <p className="muted">Đang tải…</p>;

  const refunded = inv.refundedAmount;
  const net = inv.paidAmount - refunded;
  return (
    <>
      <PageHeader
        title={`Hóa đơn #${inv.invoiceId}`}
        subtitle={`${inv.channel === 'POS' ? 'Bán tại quầy' : 'Đặt online'} · ${formatDateTime(inv.invoiceDate)}`}
        actions={
          <>
            <Link to={basePath} className="btn btn--ghost">← Danh sách</Link>
            <Link to={`${ordersPath}/${inv.invoiceId}`} className="btn btn--ghost">Xem đơn hàng</Link>
            <button className="btn btn--primary" onClick={print}>In hóa đơn</button>
          </>
        }
      />

      {refunded > 0 && (
        <p className="notice notice--refund">
          Hóa đơn này đã được hoàn tiền {formatVnd(refunded)}{inv.paymentStatus === 'REFUNDED' ? ' (toàn bộ số đã thu)' : ' (một phần)'}.
        </p>
      )}

      <div className="grid-2">
        <section className="card">
          <h3>Thông tin hóa đơn</h3>
          <dl className="kv">
            <dt>Mã hóa đơn</dt><dd>#{inv.invoiceId}</dd>
            <dt>Ngày lập</dt><dd>{formatDateTime(inv.invoiceDate)}</dd>
            <dt>Kênh bán</dt><dd>{inv.channel === 'POS' ? 'Tại quầy (POS)' : 'Online'}</dd>
            <dt>Tình trạng đơn</dt><dd><CompletionBadge status={inv.orderStatus} /></dd>
            <dt>Thanh toán</dt><dd><PaymentBadge status={inv.paymentStatus} /></dd>
            <dt>Khách hàng</dt><dd>{inv.customerName ?? 'Khách lẻ'}{inv.customerPhone ? ` · ${inv.customerPhone}` : ''}</dd>
            <dt>Nhân viên lập</dt><dd>{inv.employeeName ?? '—'}</dd>
            {inv.voucherCode && (<><dt>Voucher</dt><dd>{inv.voucherCode}</dd></>)}
            {inv.promotionName && (<><dt>Khuyến mãi</dt><dd>{inv.promotionName}</dd></>)}
            {inv.note && (<><dt>Ghi chú</dt><dd>{inv.note}</dd></>)}
          </dl>
        </section>
        {inv.channel === 'ONLINE' && (
          <section className="card">
            <h3>Giao hàng</h3>
            <dl className="kv">
              <dt>Người nhận</dt><dd>{inv.receiverName}</dd>
              <dt>Điện thoại</dt><dd>{inv.receiverPhone}</dd>
              <dt>Địa chỉ</dt><dd>{inv.shippingAddress}</dd>
            </dl>
          </section>
        )}
      </div>

      <section className="card">
        <h3>Chi tiết hóa đơn</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Giảm</th><th className="num">Thành tiền</th></tr></thead>
            <tbody>
              {inv.items.map((i, idx) => (
                <tr key={i.variantId}>
                  <td>{idx + 1}</td>
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
          <dt>Tổng tiền hàng</dt><dd>{formatVnd(inv.totalAmount)}</dd>
          <dt>Giảm giá hóa đơn</dt><dd>-{formatVnd(inv.discountAmount)}</dd>
          <dt className="grand">Phải trả</dt><dd className="grand">{formatVnd(inv.amountPayable)}</dd>
          <dt>Đã thanh toán</dt><dd>{formatVnd(inv.paidAmount)}</dd>
          <dt>Đã hoàn tiền</dt><dd className={refunded > 0 ? 'amount-refund' : undefined}>{refunded > 0 ? `-${formatVnd(refunded)}` : formatVnd(0)}</dd>
          <dt><strong>Thực thu</strong></dt><dd><strong>{formatVnd(net)}</strong></dd>
        </dl>
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>Giao dịch thanh toán</h3>
          {inv.payments.length === 0 && <p className="muted">Chưa có giao dịch.</p>}
          <ul className="plain-list">
            {inv.payments.map((p) => (
              <li key={p.paymentId}>
                <strong>{p.methodName}</strong> · {formatVnd(p.amount)} · {PAYMENT_TX_LABEL[p.status]}
                {p.paidAt && <span className="muted"> ({formatDateTime(p.paidAt)})</span>}
                {p.transactionCode && <div className="muted">Mã giao dịch: {p.transactionCode}</div>}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>Hoàn tiền</h3>
          {inv.refunds.length === 0 && <p className="muted">Hóa đơn chưa có giao dịch hoàn tiền.</p>}
          <ul className="plain-list">
            {inv.refunds.map((r) => (
              <li key={r.refundId}>
                <strong>{r.methodName}</strong> · <span className="amount-refund">-{formatVnd(r.amount)}</span> · {REFUND_STATUS_LABEL[r.status] ?? r.status}
                <div className="muted">
                  {r.completedAt ? `Hoàn lúc ${formatDateTime(r.completedAt)}` : `Yêu cầu lúc ${formatDateTime(r.requestedAt)}`}
                  {r.processedByName ? ` · ${r.processedByName}` : ''}
                </div>
                <div>Lý do: {r.reason}</div>
                {r.transactionCode && <div className="muted">Mã giao dịch: {r.transactionCode}</div>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <h3>Lịch sử trạng thái</h3>
        <ol className="timeline">
          {[...inv.history].reverse().map((h) => (
            <li key={h.historyId}>
              <div><strong>{h.oldStatus ? `${ORDER_STATUS_LABEL[h.oldStatus]} → ` : ''}{ORDER_STATUS_LABEL[h.newStatus]}</strong></div>
              <div className="muted">{formatDateTime(h.changedAt)} · {h.changedByName ?? 'Hệ thống'}</div>
              {h.note && <div>{h.note}</div>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
