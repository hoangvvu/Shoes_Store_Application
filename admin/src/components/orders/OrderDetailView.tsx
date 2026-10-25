import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
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

type Action = 'confirm' | 'ship' | 'cancel' | 'edit' | 'qr' | null;

interface Props {
  basePath: string;
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

  async function handleReviewProof(paymentId: number, status: 'SUCCESS' | 'FAILED') {
    const note = window.prompt(status === 'SUCCESS' ? 'Ghi chú duyệt (không bắt buộc):' : 'Lý do từ chối:') ?? '';
    if (status === 'FAILED' && !note.trim()) {
      window.alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    try {
      await paymentService.reviewProof(paymentId, status, note);
      void load();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

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
      void load();
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

  const qrUrl = `https://img.vietqr.io/image/970422-0000123456789-compact2.png?amount=${order.amountPayable}&addInfo=THANHTOAN_DON_${order.invoiceId}`;

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
            {order.canEdit && <button className="btn btn--ghost" onClick={() => setAction('edit')}>Sửa sản phẩm</button>}
            {order.canCancel && <button className="btn btn--danger" onClick={() => setAction('cancel')}>Hủy đơn</button>}
            <button className="btn btn--ghost" onClick={() => setAction('qr')}>Mã Quét QR</button>
            <button className="btn btn--ghost" onClick={() => print('invoice')}>In hóa đơn</button>
            {order.channel === 'ONLINE' && <button className="btn btn--ghost" onClick={() => print('delivery')}>In phiếu giao</button>}
            {canDelete && (s === 'PENDING' || s === 'CANCELLED') && <button className="btn btn--danger" onClick={remove}>Xóa mềm</button>}
          </>
        }
      />

      {order.refundRequired && (
        <p className="notice">Đơn đã thu {formatVnd(order.paidAmount)} trước khi hủy. Cần tạo yêu cầu hoàn tiền ở module Thanh toán.</p>
      )}

      {/* Bố cục Master-Detail Cân Đối: Cột chính (Sản phẩm, Thanh toán) & Cột phụ Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        
        {/* Cột chính bên trái */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bảng sản phẩm */}
          <section className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Sản phẩm</h3>
              <button className="btn btn--ghost btn--small" onClick={() => setAction('qr')}>📱 Mở QR thanh toán</button>
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
                    <th className="actions-col" />
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
                      <td className="actions">
                        <button className="btn btn--ghost btn--small" onClick={() => setAction('edit')}>Chi tiết</button>
                      </td>
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

          {/* Giao dịch thanh toán */}
          <section className="card" style={{ marginBottom: 0 }}>
            <h3>Giao dịch thanh toán</h3>
            <p className="muted" style={{ fontSize: '0.85em', marginBottom: 12 }}>* Việc xác nhận thu tiền mặt do nhân viên giao hàng thực hiện trên ứng dụng Mobile.</p>
            {order.payments.length === 0 && <p className="muted">Chưa có giao dịch.</p>}
            <ul className="plain-list">
              {order.payments.map((p) => (
                <li key={p.paymentId} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <strong>{p.methodName}</strong> · {formatVnd(p.amount)}
                    </span>
                    <span className={`badge ${p.status === 'SUCCESS' ? 'badge--confirmed' : p.status === 'FAILED' ? 'badge--cancelled' : 'badge--pending'}`}>
                      {PAYMENT_TX_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  {p.paidAt && <div className="muted" style={{ fontSize: '0.85em', marginTop: 2 }}>Đã thu: {formatDateTime(p.paidAt)}</div>}

                  {p.proofUrl && (
                    <div style={{ marginTop: 8, background: '#f9fafb', padding: 8, borderRadius: 6 }}>
                      <div style={{ marginBottom: 6 }}>
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="link" style={{ fontWeight: 500 }}>
                          📷 Xem ảnh chứng từ chuyển khoản ↗
                        </a>
                      </div>
                      {p.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn--small btn--primary" onClick={() => handleReviewProof(p.paymentId, 'SUCCESS')}>
                            Duyệt hợp lệ
                          </button>
                          <button className="btn btn--small btn--danger" onClick={() => handleReviewProof(p.paymentId, 'FAILED')}>
                            Từ chối
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {order.refundRequired && (
              <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                <button className="btn btn--danger btn--small" onClick={handleCreateRefund}>
                  💸 Tạo yêu cầu hoàn tiền ({formatVnd(order.paidAmount - order.refundedAmount)})
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Cột thông tin phụ bên phải (Sidebar) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card Thông tin đơn */}
          <section className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Thông tin đơn</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
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
              </div>
          </section>

          {/* Card Thông tin Giao hàng */}
          <div style={{ marginBottom: 0 }}>
            <RecipientCard order={order} />
          </div>

          {/* Card Lịch sử trạng thái */}
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

      {action === 'qr' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: 24, borderRadius: 12, textAlign: 'center', maxWidth: 360, width: '100%' }}>
            <h3>Mã QR Thanh Toán Chuyển Khoản</h3>
            <p className="muted" style={{ marginBottom: 12 }}>Đơn hàng #{order.invoiceId} · Số tiền: {formatVnd(order.amountPayable)}</p>
            <img src={qrUrl} alt="VietQR" style={{ width: 240, height: 240, margin: '0 auto', display: 'block' }} />
            <p style={{ fontSize: '0.85em', color: '#6b7280', marginTop: 12 }}>Quét mã QR để tự động điền số tiền và nội dung chuyển khoản.</p>
            <button className="btn btn--primary" style={{ marginTop: 16, width: '100%' }} onClick={() => setAction(null)}>Đóng</button>
          </div>
        </div>
      )}

      {action === 'confirm' && (
        <OrderActionModal title="Xác nhận đơn hàng" label="Ghi chú (không bắt buộc)" submitText="Xác nhận" onClose={() => setAction(null)}
          onSubmit={async (t) => { await orderService.confirm(orderId, t || undefined); done(); }} />
      )}
      {action === 'ship' && (
        <OrderActionModal title="Bàn giao vận chuyển" label="Ghi chú (mã vận đơn, đơn vị vận chuyển…)" submitText="Bàn giao" onClose={() => setAction(null)}
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
      {action === 'edit' && <EditItemsModal order={order} onClose={() => setAction(null)} onSaved={done} />}
    </>
  );
}