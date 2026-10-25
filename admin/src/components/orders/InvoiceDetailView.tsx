import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { invoiceService } from '../../services/invoice.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_TX_LABEL, REFUND_STATUS_LABEL, openPrintWindow } from '../../utils/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';
import { PageHeader } from '../common/PageHeader';
import { RecipientCard } from '../orders/RecipientCard';
import { AmountSummary } from '../pos/AmountSummary';
import { CompletionBadge, PaymentBadge } from './InvoiceBadges';

/** Chi tiết hóa đơn: Đưa toàn bộ các thẻ thông tin (Thông tin, Giao hàng, Thanh toán, Hoàn tiền, Lịch sử) lên TRÊN bảng sản phẩm */
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
  const methods = [...new Set(inv.payments.filter((p) => p.status === 'SUCCESS').map((p) => p.methodName))].join(', ');
  const gross = inv.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
  const productDiscount = inv.items.reduce((sum, i) => sum + i.discountAmount, 0);
  const invoicePct = inv.totalAmount > 0 ? Math.round((inv.discountAmount * 1000) / inv.totalAmount) / 10 : 0;
  const invoiceNote = inv.discountAmount > 0
    ? `${invoicePct}% trên tổng tiền hàng sau giảm sản phẩm${inv.voucherCode ? ` · Voucher ${inv.voucherCode}` : inv.promotionName ? ` · ${inv.promotionName}` : ''}`
    : 'Không có giảm giá theo hóa đơn';

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

      {/* TẤT CẢ CÁC THẺ THÔNG TIN ĐƯỢC ĐƯA LÊN TRÊN BẢNG SẢN PHẨM THEO LƯỚI 2 CỘT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {/* 1. Thông tin hóa đơn */}
        <section className="card" style={{ marginBottom: 0 }}>
          <h3>Thông tin hóa đơn</h3>
          <InfoGrid>
            <InfoItem label="Mã hóa đơn">#{inv.invoiceId}</InfoItem>
            <InfoItem label="Ngày lập">{formatDateTime(inv.invoiceDate)}</InfoItem>
            <InfoItem label="Kênh bán">{inv.channel === 'POS' ? 'Tại quầy (POS)' : 'Online'}</InfoItem>
            <InfoItem label="Tình trạng đơn"><CompletionBadge status={inv.orderStatus} /></InfoItem>
            <InfoItem label="Thanh toán"><PaymentBadge status={inv.paymentStatus} /></InfoItem>
            <InfoItem label="Phương thức">{methods || '—'}</InfoItem>
            <InfoItem label="Khách hàng">{inv.customerName ?? 'Khách lẻ'}{inv.customerPhone ? ` · ${inv.customerPhone}` : ''}</InfoItem>
            <InfoItem label={inv.channel === 'POS' ? 'Thu ngân' : 'Nhân viên lập'}>{inv.employeeName ?? '—'}</InfoItem>
            {inv.voucherCode && <InfoItem label="Voucher">{inv.voucherCode}</InfoItem>}
            {inv.promotionName && <InfoItem label="Khuyến mãi" wide>{inv.promotionName}</InfoItem>}
            {inv.note && <InfoItem label="Ghi chú" wide>{inv.note}</InfoItem>}
          </InfoGrid>
        </section>

        {/* 2. Giao hàng */}
        <div style={{ marginBottom: 0 }}>
          <RecipientCard order={inv} />
        </div>

        {/* 3. Giao dịch thanh toán */}
        <section className="card" style={{ marginBottom: 0 }}>
          <h3>Giao dịch thanh toán</h3>
          {inv.payments.length === 0 && <p className="muted">Chưa có giao dịch.</p>}
          <ul className="plain-list">
            {inv.payments.map((p) => (
              <li key={p.paymentId} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px dashed #e5e7eb' }}>
                <strong>{p.methodName}</strong> · {formatVnd(p.amount)} · {PAYMENT_TX_LABEL[p.status] ?? p.status}
                {p.paidAt && <span className="muted"> ({formatDateTime(p.paidAt)})</span>}
                {p.transactionCode && <div className="muted" style={{ fontSize: '0.85em' }}>Mã giao dịch: {p.transactionCode}</div>}
              </li>
            ))}
          </ul>
        </section>

        {/* 4. Hoàn tiền */}
        <section className="card" style={{ marginBottom: 0 }}>
          <h3>Hoàn tiền</h3>
          {inv.refunds.length === 0 && <p className="muted">Hóa đơn chưa có giao dịch hoàn tiền.</p>}
          <ul className="plain-list">
            {inv.refunds.map((r) => (
              <li key={r.refundId} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px dashed #e5e7eb' }}>
                <strong>{r.methodName}</strong> · <span className="amount-refund">-{formatVnd(r.amount)}</span> · {REFUND_STATUS_LABEL[r.status] ?? r.status}
                <div className="muted" style={{ fontSize: '0.85em' }}>
                  {r.completedAt ? `Hoàn lúc ${formatDateTime(r.completedAt)}` : `Yêu cầu lúc ${formatDateTime(r.requestedAt)}`}
                  {r.processedByName ? ` · ${r.processedByName}` : ''}
                </div>
                <div style={{ fontSize: '0.9em' }}>Lý do: {r.reason}</div>
                {r.transactionCode && <div className="muted" style={{ fontSize: '0.85em' }}>Mã giao dịch: {r.transactionCode}</div>}
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Lịch sử trạng thái (trải đều chiếm full hàng cuối hoặc căn đều) */}
        <section className="card" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
          <h3>Lịch sử trạng thái</h3>
          <div style={{ paddingLeft: '16px', paddingRight: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
            <ol className="timeline" style={{ margin: 0, paddingLeft: '12px' }}>
              {[...inv.history].reverse().log?.length ? [...inv.history].reverse() : [...inv.history].reverse().map((h) => (
                <li key={h.historyId} style={{ paddingLeft: '20px', marginBottom: '16px', position: 'relative' }}>
                  <div><strong>{h.oldStatus ? `${ORDER_STATUS_LABEL[h.oldStatus]} → ` : ''}{ORDER_STATUS_LABEL[h.newStatus]}</strong></div>
                  <div className="muted" style={{ fontSize: '0.85em', marginTop: '2px' }}>{formatDateTime(h.changedAt)} · {h.changedByName ?? 'Hệ thống'}</div>
                  {h.note && <div style={{ fontSize: '0.9em', marginTop: '2px' }}>{h.note}</div>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>

      {/* BẢNG SẢN PHẨM Ở DƯỚI CÙNG */}
      <section className="card">
        <h3>Chi tiết hóa đơn</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Sản phẩm</th>
                <th className="num">SL</th>
                <th className="num">Đơn giá</th>
                <th className="num" title="Khuyến mãi theo sản phẩm, tính cho cả dòng">Giảm giá SP (cả dòng)</th>
                <th className="num">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((i, idx) => (
                <tr key={i.variantId}>
                  <td>{idx + 1}</td>
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
        <AmountSummary
          gross={gross}
          productDiscount={productDiscount}
          invoiceDiscount={inv.discountAmount}
          invoiceDiscountNote={invoiceNote}
          payable={inv.amountPayable}
          extra={[
            { label: 'Đã thanh toán', value: formatVnd(inv.paidAmount) },
            { label: 'Đã hoàn tiền', value: refunded > 0 ? `-${formatVnd(refunded)}` : formatVnd(0), tone: refunded > 0 ? 'refund' : undefined },
            { label: 'Thực thu', value: formatVnd(net), tone: 'strong' },
          ]}
        />
      </section>
    </>
  );
}
