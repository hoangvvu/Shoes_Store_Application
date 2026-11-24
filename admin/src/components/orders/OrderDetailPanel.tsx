import { useCallback, useEffect, useState } from 'react';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import type { OrderDetail, OrderStatus } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_STATUS_LABEL, PAYMENT_TX_LABEL } from '../../utils/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';
import { OrderActionModal } from './OrderActionModal';
import { OrderStatusBadge } from './OrderStatusBadge';
import { RecipientCard } from './RecipientCard';

type Action = 'cancel' | null;

/** Lịch sử chỉ hiển thị các mốc này (bỏ bước SHIPPING trung gian). Đơn bị hủy thì có thêm mốc Đã hủy. */
const HISTORY_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

interface Props {
  orderId: number;
  onClose: () => void;
  /** Gọi sau khi đơn thay đổi để danh sách bên trái tải lại. */
  onChanged?: () => void;
}

/** Chi tiết đơn hàng hiển thị ở ô bên cạnh danh sách với header được bọc trong ô card trắng bo góc. */
export function OrderDetailPanel({ orderId, onClose, onChanged }: Props) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'payment' | 'history'>('info');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setError('');
    try {
      setOrder(await orderService.get(orderId));
    } catch (err) {
      if (!isBackground) setError(getErrorMessage(err));
    }
  }, [orderId]);

  useEffect(() => {
    setOrder(null);
    setAction(null);
    setActionError('');
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

  const done = () => {
    setAction(null);
    void load(false);
    onChanged?.();
  };

  async function handleCreateRefund() {
    if (!order) return;
    const remainingRefundable = order.paidAmount - order.refundedAmount;
    const reason = window.prompt(`Nhập lý do hoàn tiền cho đơn #${order.invoiceId} (tối đa ${formatVnd(remainingRefundable)}):`) ?? '';
    if (!reason.trim()) return;
    try {
      await paymentService.createRefund({ invoiceId: order.invoiceId, amount: remainingRefundable, reason });
      window.alert('Đã tạo yêu cầu hoàn tiền thành công.');
      done();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  /** Xác nhận / giao hàng: không popup; lỗi hiện ngay dưới nút, nút khóa khi đang xử lý để tránh bấm đúp. */
  async function runAction(fn: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setActionError('');
    try {
      await fn();
      done();
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const handleConfirm = () => runAction(() => orderService.confirm(orderId));
  const handleDeliver = () => runAction(() => orderService.deliver(orderId));

  if (error) return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: 0 }}>Đơn hàng</h3>
        <button className="btn btn--ghost btn--small" onClick={onClose} aria-label="Đóng">✕</button>
      </div>
      <p className="form-error" style={{ marginTop: 12 }}>{error}</p>
    </div>
  );

  if (!order) return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: 0 }}>Đơn hàng #{orderId}</h3>
        <button className="btn btn--ghost btn--small" onClick={onClose} aria-label="Đóng">✕</button>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>Đang tải…</p>
    </div>
  );

  const s = order.orderStatus;

  // Giao dịch hiển thị theo đúng phương thức khách chọn lúc đặt hàng (methodName do backend trả về)
  const payments = order.payments ?? [];
  const methods = [...new Set(payments.filter((p) => p.status !== 'FAILED').map((p) => p.methodName))].join(', ');
  const PAYMENT_BADGE: Record<string, string> = { SUCCESS: 'delivered', PENDING: 'pending', FAILED: 'cancelled' };

  // Lịch sử: chỉ các mốc Chờ xác nhận → Đã xác nhận → Đã giao (kèm thời gian), xếp từ cũ đến mới
  const history = order.history.filter((h) => HISTORY_STATUSES.includes(h.newStatus));

  const confirmedBy = order.history?.find((h) => h.newStatus === 'CONFIRMED')?.changedByName;
  const deliveredBy = order.history?.find((h) => h.newStatus === 'DELIVERED')?.changedByName;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      {/* Top Header Card bo góc đồng bộ hoàn toàn với màn Chi tiết hóa đơn (ảnh 1) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: '0.95em' }}>Đơn hàng #{order.invoiceId}</span>
          <div className="muted" style={{ fontSize: '0.8em', marginTop: 1 }}>
            {order.channel === 'POS' ? 'Bán tại quầy' : 'Đặt online'} · {formatDateTime(order.invoiceDate)}
          </div>
        </div>
        <button className="btn btn--ghost btn--small" onClick={onClose} aria-label="Đóng">✕</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {s === 'PENDING' && <button className="btn btn--primary btn--small" onClick={handleConfirm} disabled={busy}>Xác nhận đơn</button>}
        {(s === 'CONFIRMED' || s === 'SHIPPING') && <button className="btn btn--primary btn--small" onClick={handleDeliver} disabled={busy}>{busy ? 'Đang xử lý…' : 'Giao hàng thành công'}</button>}
        {order.canCancel && <button className="btn btn--danger btn--small" onClick={() => setAction('cancel')} disabled={busy}>Hủy đơn</button>}
      </div>
      {actionError && <p className="form-error" role="alert" style={{ margin: 0 }}>{actionError}</p>}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', gap: 16 }}>
        <button
          onClick={() => setActiveTab('info')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'info' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'info' ? 600 : 400, color: activeTab === 'info' ? '#2563eb' : '#4b5563', cursor: 'pointer' }}
        >
          Thông tin & Sản phẩm
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'payment' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'payment' ? 600 : 400, color: activeTab === 'payment' ? '#2563eb' : '#4b5563', cursor: 'pointer' }}
        >
          Thanh toán ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{ padding: '8px 4px', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '2px solid #2563eb' : '2px solid transparent', fontWeight: activeTab === 'history' ? 600 : 400, color: activeTab === 'history' ? '#2563eb' : '#4b5563', cursor: 'pointer' }}
        >
          Lịch sử ({history.length})
        </button>
      </div>

      {order.refundRequired && (
        <p className="notice" style={{ margin: 0 }}>Đơn đã thu {formatVnd(order.paidAmount)} trước khi hủy. Cần tạo yêu cầu hoàn tiền ở module Thanh toán.</p>
      )}

      {/* Tab 1: Thông tin & Sản phẩm */}
      {activeTab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Thông tin đơn</h3>
            <InfoGrid>
              <InfoItem label="Trạng thái"><OrderStatusBadge status={s} /></InfoItem>
              <InfoItem label="Thanh toán">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</InfoItem>
              <InfoItem label="Phương thức">{methods || '—'}</InfoItem>
              <InfoItem label="Khách hàng">{order.customerName ?? 'Khách lẻ'}</InfoItem>
              <InfoItem label={order.channel === 'POS' ? 'Thu ngân' : 'Người tạo đơn'}>{order.employeeName ?? (order.channel === 'POS' ? '—' : 'Khách tự đặt')}</InfoItem>
              {confirmedBy && <InfoItem label="Nhân viên xác nhận">{confirmedBy}</InfoItem>}
              {deliveredBy && <InfoItem label="Nhân viên giao hàng">{deliveredBy}</InfoItem>}
              <InfoItem label="Kênh bán">{order.channel === 'POS' ? 'Tại quầy (POS)' : 'Online'}</InfoItem>
              {order.voucherCode && <InfoItem label="Voucher">{order.voucherCode}</InfoItem>}
              {order.promotionName && <InfoItem label="Khuyến mãi" wide>{order.promotionName}</InfoItem>}
              {order.note && <InfoItem label="Ghi chú" wide>{order.note}</InfoItem>}
            </InfoGrid>
          </section>

          <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
            <h3 style={{ marginBottom: 16 }}>Sản phẩm</h3>
            <div className="table-wrap" style={{ overflowX: 'auto', minWidth: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th className="num">SL</th>
                    <th className="num">Đơn giá</th>
                    <th className="num">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.variantId}>
                      <td>{i.productName}<br /><span className="muted">{i.sku} · Size {i.sizeLabel} · {i.colorName}</span></td>
                      <td className="num">{i.quantity}</td>
                      <td className="num">{formatVnd(i.salePrice)}</td>
                      <td className="num">{formatVnd(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <RecipientCard order={order} />
        </div>
      )}

      {/* Tab 2: Thanh toán */}
      {activeTab === 'payment' && (
        <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Giao dịch thanh toán</h3>
          {payments.length === 0 ? (
            <p className="muted">Chưa phát sinh giao dịch thanh toán.</p>
          ) : (
            <ul className="plain-list">
              {payments.map((p) => (
                <li key={p.paymentId} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #e5e7eb', wordBreak: 'break-word' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span><strong>{p.methodName}</strong> · {formatVnd(p.amount)}</span>
                    <span className={`badge status status--${PAYMENT_BADGE[p.status] ?? 'pending'}`}>{PAYMENT_TX_LABEL[p.status] ?? p.status}</span>
                  </div>
                  <div className="muted" style={{ fontSize: '0.85em', marginTop: 2 }}>
                    {p.status === 'SUCCESS' && p.paidAt ? `Đã thu: ${formatDateTime(p.paidAt)}` : p.status === 'PENDING' ? 'Chưa thu tiền' : 'Giao dịch không thành công'}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {order.refundRequired && (
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
              <button className="btn btn--danger btn--small" onClick={handleCreateRefund}>
                💸 Tạo yêu cầu hoàn tiền ({formatVnd(order.paidAmount - order.refundedAmount)})
              </button>
            </div>
          )}
        </section>
      )}

      {/* Tab 3: Lịch sử */}
      {activeTab === 'history' && (
        <section className="card" style={{ marginBottom: 0, minWidth: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Lịch sử trạng thái</h3>
          <ol className="timeline" style={{ margin: 0, paddingLeft: 12 }}>
            {history.map((h) => (
              <li key={h.historyId} style={{ paddingLeft: 16, marginBottom: 14, position: 'relative' }}>
                <div><strong>{ORDER_STATUS_LABEL[h.newStatus]}</strong></div>
                <div className="muted" style={{ fontSize: '0.82em', marginTop: 2 }}>{formatDateTime(h.changedAt)}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {action === 'cancel' && (
        <OrderActionModal title="Hủy đơn hàng" label="Lý do hủy" submitText="Hủy đơn" required danger onClose={() => setAction(null)}
          onSubmit={async (t) => {
            const res = await orderService.cancel(orderId, t);
            setOrder(res);
            setAction(null);
            onChanged?.();
          }} />
      )}
    </div>
  );
}
