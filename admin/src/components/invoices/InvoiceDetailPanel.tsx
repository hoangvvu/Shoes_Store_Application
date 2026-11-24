import { useCallback, useEffect, useState } from 'react';
import { invoiceService } from '../../services/invoice.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatVnd } from '../../utils/format';
import { openPrintWindow } from '../../utils/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';
import { RecipientCard } from '../orders/RecipientCard';
import { AmountSummary } from '../pos/AmountSummary';
import { PaymentBadge } from './InvoiceBadges';

interface Props {
  invoiceId: number;
  onClose: () => void;
}

/** Chi tiết hóa đơn hiển thị ở ô bên cạnh danh sách với các tab phân tách rõ ràng. */
export function InvoiceDetailPanel({ invoiceId, onClose }: Props) {
  const [inv, setInv] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'products'>('info');

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
  const confirmed = inv.history?.find((h) => h.newStatus === 'CONFIRMED');
  const delivered = inv.history?.find((h) => h.newStatus === 'DELIVERED');

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
          Hóa đơn
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
              <InfoItem label="Thanh toán"><PaymentBadge status={inv.paymentStatus} /></InfoItem>
              <InfoItem label="Phương thức">{methods || '—'}</InfoItem>
              <InfoItem label="Khách hàng">{inv.customerName ?? 'Khách lẻ'}</InfoItem>
              <InfoItem label={inv.channel === 'POS' ? 'Thu ngân' : 'Người tạo đơn'}>{inv.employeeName ?? (inv.channel === 'POS' ? '—' : 'Khách tự đặt')}</InfoItem>
              {confirmed && <InfoItem label="Nhân viên xác nhận">{confirmed.changedByName ?? 'Hệ thống'}</InfoItem>}
              {delivered && <InfoItem label={inv.channel === 'POS' ? 'Nhân viên bán hàng' : 'Nhân viên giao hàng'}>{delivered.changedByName ?? 'Hệ thống'}</InfoItem>}
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
          <h3>Chi tiết hóa đơn</h3>
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
    </div>
  );
}