import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_STATUS_LABEL, PAYMENT_TX_LABEL, openPrintWindow } from '../../utils/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';
import { PageHeader } from '../common/PageHeader';
import { AmountSummary } from '../pos/AmountSummary';
import { EditItemsModal } from './EditItemsModal';
import { OrderActionModal } from './OrderActionModal';
import { OrderStatusBadge } from './OrderStatusBadge';
import { RecipientCard } from './RecipientCard';

type Action = 'confirm' | 'ship' | 'deliver' | 'cancel' | 'edit' | null;

interface Props {
  basePath: string;
  /** Chỉ Admin được xóa mềm đơn. */
  canDelete: boolean;
}

export function OrderDetailView({ basePath, canDelete }: Props) {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setOrder(await orderService.get(orderId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function print(type: 'invoice' | 'delivery') {
    try {
      openPrintWindow(await orderService.printHtml(orderId, type));
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function remove() {
    if (!window.confirm(`Xóa mềm đơn #${orderId}? Chỉ áp dụng cho đơn chờ xác nhận hoặc đã hủy.`)) return;
    try {
      await orderService.remove(orderId);
      navigate(basePath, { replace: true });
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  const done = () => {
    setAction(null);
    void load();
  };

  if (error) return (<><p className="form-error">{error}</p><Link to={basePath} className="link">← Quay lại danh sách</Link></>);
  if (!order) return <p className="muted">Đang tải…</p>;

  const s = order.orderStatus;
  const methods = [...new Set(order.payments.filter((p) => p.status === 'SUCCESS').map((p) => p.methodName))].join(', ');
  const gross = order.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
  const productDiscount = order.items.reduce((sum, i) => sum + i.discountAmount, 0);
  const invoicePct = order.totalAmount > 0 ? Math.round((order.discountAmount * 1000) / order.totalAmount) / 10 : 0;
  const invoiceNote = order.discountAmount > 0
    ? `${invoicePct}% trên tổng tiền hàng sau giảm sản phẩm${order.voucherCode ? ` · Voucher ${order.voucherCode}` : order.promotionName ? ` · ${order.promotionName}` : ''}`
    : 'Không có giảm giá theo hóa đơn';
  return (
    <>
      <PageHeader
        title={`Đơn hàng #${order.invoiceId}`}
        subtitle={`${order.channel === 'POS' ? 'Bán tại quầy' : 'Đặt online'} · ${formatDateTime(order.invoiceDate)}`}
        actions={
          <>
            <Link to={basePath} className="btn btn--ghost">← Danh sách</Link>
            {s === 'PENDING' && <button className="btn btn--primary" onClick={() => setAction('confirm')}>Xác nhận đơn</button>}
            {s === 'CONFIRMED' && <button className="btn btn--primary" onClick={() => setAction('ship')}>Bàn giao vận chuyển</button>}
            {s === 'SHIPPING' && <button className="btn btn--primary" onClick={() => setAction('deliver')}>Xác nhận đã giao</button>}
            {order.canEdit && <button className="btn btn--ghost" onClick={() => setAction('edit')}>Sửa sản phẩm</button>}
            {order.canCancel && <button className="btn btn--danger" onClick={() => setAction('cancel')}>Hủy đơn</button>}
            <button className="btn btn--ghost" onClick={() => print('invoice')}>In hóa đơn</button>
            {order.channel === 'ONLINE' && <button className="btn btn--ghost" onClick={() => print('delivery')}>In phiếu giao</button>}
            {canDelete && (s === 'PENDING' || s === 'CANCELLED') && <button className="btn btn--danger" onClick={remove}>Xóa mềm</button>}
          </>
        }
      />

      {order.refundRequired && (
        <p className="notice">Đơn đã thu {formatVnd(order.paidAmount)} trước khi hủy. Cần tạo yêu cầu hoàn tiền ở module Thanh toán.</p>
      )}

      <div className="grid-2">
        <section className="card">
          <h3>Thông tin đơn</h3>
          <InfoGrid>
            <InfoItem label="Trạng thái"><OrderStatusBadge status={s} /></InfoItem>
            <InfoItem label="Thanh toán">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</InfoItem>
            <InfoItem label="Phương thức">{methods || '—'}</InfoItem>
            <InfoItem label="Khách hàng">{order.customerName ?? 'Khách lẻ'}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</InfoItem>
            <InfoItem label={order.channel === 'POS' ? 'Thu ngân' : 'Nhân viên'}>{order.employeeName ?? '—'}</InfoItem>
            <InfoItem label="Kênh bán">{order.channel === 'POS' ? 'Tại quầy (POS)' : 'Online'}</InfoItem>
            {order.voucherCode && <InfoItem label="Voucher">{order.voucherCode}</InfoItem>}
            {order.promotionName && <InfoItem label="Khuyến mãi" wide>{order.promotionName}</InfoItem>}
            {order.note && <InfoItem label="Ghi chú" wide>{order.note}</InfoItem>}
          </InfoGrid>
        </section>
        <RecipientCard order={order} />
      </div>

      <section className="card">
        <h3>Sản phẩm</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Sản phẩm</th><th className="num">SL</th><th className="num">Đơn giá</th><th className="num" title="Khuyến mãi theo sản phẩm, tính cho cả dòng">Giảm giá SP (cả dòng)</th><th className="num">Thành tiền</th></tr></thead>
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
        <AmountSummary
          gross={gross}
          productDiscount={productDiscount}
          invoiceDiscount={order.discountAmount}
          invoiceDiscountNote={invoiceNote}
          payable={order.amountPayable}
          extra={[
            { label: 'Đã thanh toán', value: formatVnd(order.paidAmount) },
            ...(order.refundedAmount > 0
              ? [
                  { label: 'Đã hoàn tiền', value: `-${formatVnd(order.refundedAmount)}`, tone: 'refund' as const },
                  { label: 'Thực thu', value: formatVnd(order.paidAmount - order.refundedAmount), tone: 'strong' as const },
                ]
              : []),
          ]}
        />
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>Giao dịch thanh toán</h3>
          {order.payments.length === 0 && <p className="muted">Chưa có giao dịch.</p>}
          <ul className="plain-list">
            {order.payments.map((p) => (
              <li key={p.paymentId}>
                <strong>{p.methodName}</strong> · {formatVnd(p.amount)} · {PAYMENT_TX_LABEL[p.status]}
                {p.paidAt && <span className="muted"> ({formatDateTime(p.paidAt)})</span>}
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h3>Lịch sử trạng thái</h3>
          <ol className="timeline">
            {[...order.history].reverse().map((h) => (
              <li key={h.historyId}>
                <div>
                  <strong>{h.oldStatus ? `${ORDER_STATUS_LABEL[h.oldStatus]} → ` : ''}{ORDER_STATUS_LABEL[h.newStatus]}</strong>
                </div>
                <div className="muted">{formatDateTime(h.changedAt)} · {h.changedByName ?? 'Hệ thống'}</div>
                {h.note && <div>{h.note}</div>}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {action === 'confirm' && (
        <OrderActionModal title="Xác nhận đơn hàng" label="Ghi chú (không bắt buộc)" submitText="Xác nhận" onClose={() => setAction(null)}
          onSubmit={async (t) => { await orderService.confirm(orderId, t || undefined); done(); }} />
      )}
      {action === 'ship' && (
        <OrderActionModal title="Bàn giao vận chuyển" label="Ghi chú (mã vận đơn, đơn vị vận chuyển…)" submitText="Bàn giao" onClose={() => setAction(null)}
          onSubmit={async (t) => { await orderService.ship(orderId, t || undefined); done(); }} />
      )}
      {action === 'deliver' && (
        <OrderActionModal title="Xác nhận đã giao" label="Ghi chú (không bắt buộc)" submitText="Đã giao" onClose={() => setAction(null)}
          onSubmit={async (t) => { await orderService.deliver(orderId, t || undefined); done(); }} />
      )}
      {action === 'cancel' && (
        <OrderActionModal title="Hủy đơn hàng" label="Lý do hủy" submitText="Hủy đơn" required danger onClose={() => setAction(null)}
          onSubmit={async (t) => {
            const res = await orderService.cancel(orderId, t);
            setOrder(res);
            setAction(null);
          }} />
      )}
      {action === 'edit' && <EditItemsModal order={order} onClose={() => setAction(null)} onSaved={done} />}
    </>
  );
}
