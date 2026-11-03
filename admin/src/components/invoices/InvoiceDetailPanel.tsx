import { useCallback, useEffect, useState } from 'react';
import { invoiceService } from '../../services/invoice.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_TX_LABEL, REFUND_STATUS_LABEL, openPrintWindow } from '../../utils/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';
import { RecipientCard } from '../orders/RecipientCard';
import { AmountSummary } from '../pos/AmountSummary';
import { CompletionBadge, PaymentBadge } from './InvoiceBadges';

interface Props {
  invoiceId: number;
  onClose: () => void;
}

/** Chi tiết hóa đơn hiển thị ở ô bên cạnh danh sách với các tab phân tách rõ ràng. */
export function InvoiceDetailPanel({ invoiceId, onClose }: Props) {
  const [inv, setInv] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'payment' | 'history'>('info');

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setError('');
    try {
      setInv(await invoiceService.get(invoiceId));
    } catch (err) {
      if (!isBackground) setError(getErrorMessage(err));
    }
  }, [invoiceId]);

  useEffect(() => {
    setInv(null);
    void load(false);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load(true), 4000);
    const handleFocus = () => void load(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  async function print() {
    try {
      openPrintWindow(await invoiceService.printHtml(invoiceId));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  if (error) return (<div style={{ minWidth: 0 }}><p className="form-error">{error}</p></div>);
  if (!inv) return (<div style={{ minWidth: 0 }}><p className="muted">Đang tải…</p></div>);

  const refunded = inv.refundedAmount;
  const net = inv.paidAmount - refunded;
  const methods = [...new Set(inv.payments.filter((p) => p.status === 'SUCCESS').map((p) => p.methodName))].join(', ');
  const gross = inv.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
  const productDiscount = inv.items.reduce((sum, i) => sum + i.discountAmount, 0);
  const invoicePct = inv.totalAmount > 0 ? Math.round((inv.discountAmount * 1000) / inv.totalAmount) / 10 : 0;
  const invoiceNote = inv.discountAmount > 0
    ? `${invoicePct}% trên tổng tiền hàng sau giảm sản phẩm${inv.voucherCode ? ` · Voucher ${inv.voucherCode}` : inv.promotionName ? ` · ${inv.promotionName}` : ''}`
    : 'Không có giảm giá theo hóa đơn';
  const confirmedBy = inv.history?.find((h) => h.newStatus === 'CONFIRMED')?.changedByName;
  const shippedBy = inv.history?.find((h) => h.newStatus === 'SHIPPING')?.changedByName;
  const deliveredBy = inv.history?.find((h) => h.newStatus === 'DELIVERED')?.changedByName;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {/* Top Action Bar: In hóa đơn & Nút đóng nằm gọn trong khung trắng */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.95em' }}>Hóa đơn #{inv.invoiceId}</span>
          <div className="muted" style={{ fontSize: '0.8em', marginTop: 1 }}>{inv.channel === 'POS' ? 'Bán tại quầy' : 'Đặt online'} · {formatDateTime(inv.invoiceDate)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--primary btn--small" onClick={print}>In hóa đơn</button>
          <button className="btn btn--ghost btn--small" onClick={onClose} aria-label="Đóng">✕</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', gap: 12, overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'info' ? 600 : 400, color: activeTab === 'info' ? '#2563eb' : '#4b5563', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Thông tin HĐ
        </button>
        <button
          onClick={() => setActiveTab('products')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'products' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'products' ? 600 : 400, color: activeTab === 'products' ? '#2563eb' : '#4b5563', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Sản phẩm ({inv.items.length})
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'payment' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'payment' ? 600 : 400, color: activeTab === 'payment' ? '#2563eb' : '#4b5563', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Thanh toán ({inv.payments.length + inv.refunds.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'history' ? 600 : 400, color: activeTab === 'history' ? '#2563eb' : '#4b5563', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Lịch sử ({inv.history.length})
        </button>
      </div>

      {refunded > 0 && (
        <p className="notice notice--refund" style={{ margin: 0 }}>
          Hóa đơn này đã được hoàn tiền {formatVnd(refunded)}{inv.paymentStatus === 'REFUNDED' ? ' (toàn bộ số đã thu)' : ' (một phần)'}.
        </p>
      )}

      {/* Tab 1: Thông tin HĐ */}
      {activeTab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Thông tin hóa đơn</h3>
            <InfoGrid>
              <InfoItem label="Mã hóa đơn">#{inv.invoiceId}</InfoItem>
              <InfoItem label="Ngày lập">{formatDateTime(inv.invoiceDate)}</InfoItem>
              <InfoItem label="Kênh bán">{inv.channel === 'POS' ? 'Tại quầy (POS)' : 'Online'}</InfoItem>
              <InfoItem label="Tình trạng đơn"><CompletionBadge status={inv.orderStatus} /></InfoItem>
              <InfoItem label="Thanh toán"><PaymentBadge status={inv.paymentStatus} /></InfoItem>
              <InfoItem label="Phương thức">{methods || '—'}</InfoItem>
              <InfoItem label="Khách hàng">{inv.customerName ?? 'Khách lẻ'}</InfoItem>
              <InfoItem label={inv.channel === 'POS' ? 'Thu ngân' : 'Người tạo đơn'}>{inv.employeeName ?? (inv.channel === 'POS' ? '—' : 'Khách tự đặt')}</InfoItem>
              {confirmedBy && <InfoItem label="Nhân viên xác nhận">{confirmedBy}</InfoItem>}
              {shippedBy && <InfoItem label="Bàn giao vận chuyển">{shippedBy}</InfoItem>}
              {deliveredBy && <InfoItem label="Nhân viên giao hàng">{deliveredBy}</InfoItem>}
              {inv.voucherCode && <InfoItem label="Voucher">{inv.voucherCode}</InfoItem>}
              {inv.promotionName && <InfoItem label="Khuyến mãi" wide>{inv.promotionName}</InfoItem>}
              {inv.note && <InfoItem label="Ghi chú" wide>{inv.note}</InfoItem>}
            </InfoGrid>
          </section>
          <RecipientCard order={inv} />
        </div>
      )}

      {/* Tab 2: Sản phẩm */}
      {activeTab === 'products' && (
        <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
          <h3>Chi tiết sản phẩm</h3>
          <div className="table-wrap" style={{ overflowX: 'auto', minWidth: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sản phẩm</th>
                  <th className="num">SL</th>
                  <th className="num">Đơn giá</th>
                  <th className="num">Giảm giá SP</th>
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
      )}

      {/* Tab 3: Thanh toán */}
      {activeTab === 'payment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
            <h3>Giao dịch thanh toán</h3>
            {inv.payments.length === 0 && <p className="muted">Chưa có giao dịch.</p>}
            <ul className="plain-list">
              {inv.payments.map((p) => (
                <li key={p.paymentId} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px dashed #e5e7eb', wordBreak: 'break-word' }}>
                  <strong>{p.methodName}</strong> · {formatVnd(p.amount)} · {PAYMENT_TX_LABEL[p.status] ?? p.status}
                  {p.paidAt && <span className="muted"> ({formatDateTime(p.paidAt)})</span>}
                  {p.transactionCode && <div className="muted" style={{ fontSize: '0.85em' }}>Mã giao dịch: {p.transactionCode}</div>}
                </li>
              ))}
            </ul>
          </section>

          <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
            <h3>Hoàn tiền</h3>
            {inv.refunds.length === 0 && <p className="muted">Hóa đơn chưa có giao dịch hoàn tiền.</p>}
            <ul className="plain-list">
              {inv.refunds.map((r) => (
                <li key={r.refundId} style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px dashed #e5e7eb', wordBreak: 'break-word' }}>
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
        </div>
      )}

      {/* Tab 4: Lịch sử */}
      {activeTab === 'history' && (
        <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Lịch sử trạng thái</h3>
          <ol className="timeline" style={{ margin: 0, paddingLeft: 12 }}>
            {[...inv.history].reverse().map((h) => (
              <li key={h.historyId} style={{ paddingLeft: 16, marginBottom: 14, position: 'relative', wordBreak: 'break-word' }}>
                <div><strong>{h.oldStatus ? `${ORDER_STATUS_LABEL[h.oldStatus]} → ` : ''}{ORDER_STATUS_LABEL[h.newStatus]}</strong></div>
                <div className="muted" style={{ fontSize: '0.82em', marginTop: 2 }}>{formatDateTime(h.changedAt)} · {h.changedByName ?? 'Hệ thống'}</div>
                {h.note && <div style={{ fontSize: '0.88em', marginTop: 2 }}>{h.note}</div>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}