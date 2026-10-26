import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_STATUS_LABEL, PAYMENT_TX_LABEL } from '../../utils/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';
import { PageHeader } from '../common/PageHeader';
import { AmountSummary } from '../pos/AmountSummary';
import { OrderActionModal } from './OrderActionModal';
import { OrderStatusBadge } from './OrderStatusBadge';
import { RecipientCard } from './RecipientCard';

type Action = 'confirm' | 'ship' | 'cancel' | null;

interface Props {
  basePath: string;
  canDelete?: boolean;
}

export function OrderDetailView({ basePath }: Props) {
  const { id } = useParams();
  const orderId = Number(id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [action, setAction] = useState<Action>(null);

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setError('');
    try {
      const data = await orderService.get(orderId);
      setOrder(data);
    } catch (err) {
      if (!isBackground) setError(getErrorMessage(err));
    }
  }, [orderId]);

  useEffect(() => {
    void load(false);
  }, [load]);

  // Real-time polling chi tiết đơn hàng mỗi 4 giây để cập nhật trạng thái thanh toán QR / duyệt chứng từ tức thì
  useEffect(() => {
    const interval = setInterval(() => {
      void load(true);
    }, 4000);

    const handleFocus = () => void load(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  async function handleCreateRefund() {
    if (!order) return;
    const remainingRefundable = order.paidAmount - order.refundedAmount;
    const reason = window.prompt(`Nhập lý do hoàn tiền cho đơn #${order.invoiceId} (tối đa ${formatVnd(remainingRefundable)}):`) ?? '';
    if (!reason.trim()) return;
    try {
      await paymentService.createRefund({
        invoiceId: order.invoiceId,
        amount: remainingRefundable,
        reason,
      });
      window.alert('Đã tạo yêu cầu hoàn tiền thành công.');
      void load(false);
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function handleConfirm() {
    try {
      await orderService.confirm(orderId);
      done();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  const done = () => {
    setAction(null);
    void load(false);
  };

  if (error) return (<><p className="form-error">{error}</p><Link to={basePath} className="link">← Quay lại danh sách</Link></>);
  if (!order) return <p className="muted">Đang tải…</p>;

  const s = order.orderStatus;

  // Hàm xác định chính xác tên phương thức thanh toán thực tế
  const getCleanPaymentMethodName = (methodName?: string, payment?: any) => {
    const raw = (methodName || payment?.method || payment?.type || payment?.gateway || '').toUpperCase();
    if (
      raw.includes('QR') ||
      raw.includes('VIETQR') ||
      raw.includes('CHUYỂN KHOẢN') ||
      raw.includes('TRANSFER') ||
      raw.includes('BANK')
    ) {
      return 'Chuyển khoản quét QR';
    }
    if (raw.includes('CASH') || raw.includes('TIỀN MẶT') || raw === 'COD') {
      return 'Tiền mặt';
    }
    return methodName || payment?.method || 'Tiền mặt';
  };

  // Hàm hiển thị trạng thái chi tiết dựa trên trạng thái giao dịch thực tế
  const getPaymentStatusDisplay = (p: any) => {
    const method = getCleanPaymentMethodName(p.methodName, p);
    if (p.status === 'SUCCESS') {
      return method.includes('QR') ? 'Chuyển khoản QR thành công' : 'Thu tiền mặt thành công';
    }
    if (p.status === 'FAILED') {
      return `${method} - Thất bại`;
    }
    return `${method} - Chờ thu`;
  };

  // Lọc chỉ lấy các giao dịch đã thanh toán thành công (SUCCESS)
  const successfulPayments = order.payments?.filter((p) => p.status === 'SUCCESS') || [];
  const methods = [...new Set(successfulPayments.map((p) => getCleanPaymentMethodName(p.methodName, p)))].join(', ');
  
  const gross = order.items.reduce((sum, i) => sum + i.salePrice * i.quantity, 0);
  const productDiscount = order.items.reduce((sum, i) => sum + i.discountAmount, 0);
  const invoicePct = order.totalAmount > 0 ? Math.round((order.discountAmount * 1000) / order.totalAmount) / 10 : 0;
  const invoiceNote = order.discountAmount > 0
    ? `${invoicePct}% trên tổng tiền hàng sau giảm sản phẩm${order.voucherCode ? ` · Voucher ${order.voucherCode}` : order.promotionName ? ` · ${order.promotionName}` : ''}`
    : 'Không có giảm giá theo hóa đơn';
  const confirmedBy = order.history?.find((h) => h.newStatus === 'CONFIRMED')?.changedByName;
  const shippedBy = order.history?.find((h) => h.newStatus === 'SHIPPING')?.changedByName;
  const deliveredBy = order.history?.find((h) => h.newStatus === 'DELIVERED')?.changedByName;
  return (
    <>
      <PageHeader
        title={`Đơn hàng #${order.invoiceId}`}
        subtitle={`${order.channel === 'POS' ? 'Bán tại quầy' : 'Đặt online'} · ${formatDateTime(order.invoiceDate)}`}
        actions={
          <>
            <Link to={basePath} className="btn btn--ghost">← Danh sách</Link>
            {s === 'PENDING' && <button className="btn btn--primary" onClick={handleConfirm}>Xác nhận đơn</button>}
            {s === 'CONFIRMED' && <button className="btn btn--primary" onClick={() => setAction('ship')}>Bàn giao vận chuyển</button>}
            {order.canCancel && <button className="btn btn--danger" onClick={() => setAction('cancel')}>Hủy đơn</button>}
          </>
        }
      />

      {order.refundRequired && (
        <p className="notice">Đơn đã thu {formatVnd(order.paidAmount)} trước khi hủy. Cần tạo yêu cầu hoàn tiền ở module Thanh toán.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Sản phẩm</h3>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th className="num">SL</th>
                    <th className="num">Đơn giá</th>
                    <th className="num" title="Khuyến mãi theo sản phẩm, tính cho cả dòng">Giảm giá SP</th>
                    <th className="num">Thành tiền</th>
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

          <section className="card" style={{ marginBottom: 0 }}>
            <h3>Giao dịch thanh toán</h3>
            <p className="muted" style={{ fontSize: '0.85em', marginBottom: 12 }}>* Việc xác nhận thanh toán được ghi nhận theo phương thức thực tế của giao dịch.</p>
            
            {/* Ban đầu không có giao dịch SUCCESS thì hiện thông báo chưa phát sinh, sau khi thanh toán xong sẽ hiển thị giao dịch thành công */}
            {successfulPayments.length === 0 ? (
              <p className="muted">Chưa phát sinh giao dịch thanh toán.</p>
            ) : (
              <ul className="plain-list">
                {successfulPayments.map((p) => (
                  <li key={p.paymentId} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        <strong>{getPaymentStatusDisplay(p)}</strong> · {formatVnd(p.amount)}
                      </span>
                      <span className="badge badge--confirmed">
                        {PAYMENT_TX_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    {p.paidAt && <div className="muted" style={{ fontSize: '0.85em', marginTop: 2 }}>Đã thu: {formatDateTime(p.paidAt)}</div>}
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Thông tin đơn</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                <InfoGrid>
                  <InfoItem label="Trạng thái"><OrderStatusBadge status={s} /></InfoItem>
                  <InfoItem label="Thanh toán">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</InfoItem>
                  <InfoItem label="Phương thức">{methods || '—'}</InfoItem>
                  <InfoItem label="Khách hàng">{order.customerName ?? 'Khách lẻ'}</InfoItem>
                  <InfoItem label={order.channel === 'POS' ? 'Thu ngân' : 'Người tạo đơn'}>{order.employeeName ?? (order.channel === 'POS' ? '—' : 'Khách tự đặt')}</InfoItem>
                  {confirmedBy && <InfoItem label="Nhân viên xác nhận">{confirmedBy}</InfoItem>}
                  {shippedBy && <InfoItem label="Bàn giao vận chuyển">{shippedBy}</InfoItem>}
                  {deliveredBy && <InfoItem label="Nhân viên giao hàng">{deliveredBy}</InfoItem>}
                  <InfoItem label="Kênh bán">{order.channel === 'POS' ? 'Tại quầy (POS)' : 'Online'}</InfoItem>
                  {order.voucherCode && <InfoItem label="Voucher">{order.voucherCode}</InfoItem>}
                  {order.promotionName && <InfoItem label="Khuyến mãi" wide>{order.promotionName}</InfoItem>}
                  {order.note && <InfoItem label="Ghi chú" wide>{order.note}</InfoItem>}
                </InfoGrid>
              </div>
          </section>

          <div style={{ marginBottom: 0 }}>
            <RecipientCard order={order} />
          </div>

          <section className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Lịch sử trạng thái</h3>
            <div style={{ paddingLeft: '4px' }}>
              <ol className="timeline" style={{ margin: 0, paddingLeft: '12px' }}>
                {[...order.history].reverse().map((h) => (
                  <li key={h.historyId} style={{ paddingLeft: '16px', marginBottom: '14px', position: 'relative' }}>
                    <div>
                      <strong>{h.oldStatus ? `${ORDER_STATUS_LABEL[h.oldStatus]} → ` : ''}{ORDER_STATUS_LABEL[h.newStatus]}</strong>
                    </div>
                    <div className="muted" style={{ fontSize: '0.82em', marginTop: '2px' }}>
                      {formatDateTime(h.changedAt)} · {h.changedByName ?? 'Hệ thống'}
                    </div>
                    {h.note && <div style={{ fontSize: '0.88em', marginTop: '2px' }}>{h.note}</div>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>

      {action === 'confirm' && (
        <OrderActionModal title="Xác nhận đơn hàng" label="Ghi chú (không bắt buộc)" submitText="Xác nhận" onClose={() => setAction(null)}
          onSubmit={async (t) => { await orderService.confirm(orderId, t || undefined); done(); }} />
      )}
      {action === 'ship' && (
        <OrderActionModal title="Bàn giao vận chuyển" label="Ghi chú cho nhân viên vận chuyển (không bắt buộc)" submitText="Bàn giao" onClose={() => setAction(null)}
          onSubmit={async (t) => { await orderService.ship(orderId, t || undefined); done(); }} />
      )}
      {action === 'cancel' && (
        <OrderActionModal title="Hủy đơn hàng" label="Lý do hủy" submitText="Hủy đơn" required danger onClose={() => setAction(null)}
          onSubmit={async (t) => {
            const res = await orderService.cancel(orderId, t);
            setOrder(res);
            setAction(null);
          }} />
      )}
    </>
  );
}