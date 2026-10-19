import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { ORDER_STATUS_LABEL, formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_STATUS_LABEL, PAYMENT_TX_LABEL, openPrintWindow } from '../../utils/order';
import { PageHeader } from '../common/PageHeader';
import { EditItemsModal } from './EditItemsModal';
import { OrderActionModal } from './OrderActionModal';
import { OrderStatusBadge } from './OrderStatusBadge';

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

  async function handleConfirmCash(paymentId: number) {
    if (!window.confirm('Xác nhận đã thu đủ tiền mặt cho đơn hàng?')) return;
    try {
      await paymentService.confirmCash(paymentId);
      void load();
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
          <dl className="kv">
            <dt>Trạng thái</dt><dd><OrderStatusBadge status={s} /></dd>
            <dt>Thanh toán</dt><dd>{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</dd>
            <dt>Khách hàng</dt><dd>{order.customerName ?? 'Khách lẻ'}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</dd>
            <dt>Nhân viên</dt><dd>{order.employeeName ?? '—'}</dd>
            {order.voucherCode && (<><dt>Voucher</dt><dd>{order.voucherCode}</dd></>)}
            {order.promotionName && (<><dt>Khuyến mãi</dt><dd>{order.promotionName}</dd></>)}
            {order.note && (<><dt>Ghi chú</dt><dd>{order.note}</dd></>)}
          </dl>
        </section>
        {order.channel === 'ONLINE' && (
          <section className="card">
            <h3>Giao hàng</h3>
            <dl className="kv">
              <dt>Người nhận</dt><dd>{order.receiverName}</dd>
              <dt>Điện thoại</dt><dd>{order.receiverPhone}</dd>
              <dt>Địa chỉ</dt><dd>{order.shippingAddress}</dd>
            </dl>
            <p className="muted">Địa chỉ được chụp lại lúc đặt hàng, không đổi khi khách sửa sổ địa chỉ.</p>
          </section>
        )}
      </div>

      <section className="card">
        <h3>Sản phẩm</h3>
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
          <dt className="grand">Phải trả</dt><dd className="grand">{formatVnd(order.amountPayable)}</dd>
          <dt>Đã thanh toán</dt><dd>{formatVnd(order.paidAmount)}</dd>
        </dl>
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>Giao dịch thanh toán</h3>
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

                {p.status === 'PENDING' && p.methodCode === 'CASH' && (
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn--small btn--primary" onClick={() => handleConfirmCash(p.paymentId)}>
                      ✓ Xác nhận đã thu tiền mặt
                    </button>
                  </div>
                )}

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
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
              <button className="btn btn--danger btn--small" onClick={handleCreateRefund}>
                💸 Tạo yêu cầu hoàn tiền ({formatVnd(order.paidAmount - order.refundedAmount)})
              </button>
            </div>
          )}
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
