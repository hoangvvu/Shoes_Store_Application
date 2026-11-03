import { useCallback, useEffect, useState } from 'react';
import { orderService } from '../../services/order.service';
import type { Paged } from '../../types/customer';
import type { Channel, OrderListItem, OrderStatus } from '../../types/order';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_STATUS_LABEL, STATUS_OPTIONS } from '../../utils/order';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { Pagination } from '../tables/Pagination';
import { OrderDetailPanel } from './OrderDetailPanel';
import { OrderStatusBadge } from './OrderStatusBadge';

const SIZE = 10;

interface Filters {
  q: string;
  status: string;
  channel: string;
  from: string;
  to: string;
}
const EMPTY: Filters = { q: '', status: '', channel: '', from: '', to: '' };

/** Danh sách đơn dùng chung cho Admin và Bán hàng; chi tiết hiện ở ô bên phải khi bấm vào dòng. */
export function OrderManager(_props: { basePath?: string }) {
  const { draft, applied, page, setPage, set, apply, pending } = useSearchFilters<Filters>(EMPTY);
  const [data, setData] = useState<Paged<OrderListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError('');
    try {
      const result = await orderService.list({
        status: (applied.status || undefined) as OrderStatus | undefined,
        channel: (applied.channel || undefined) as Channel | undefined,
        from: applied.from || undefined,
        to: applied.to || undefined,
        q: applied.q.trim(),
        page,
        size: SIZE,
      });
      setData(result);
    } catch (err) {
      if (!isBackground) setError(getErrorMessage(err));
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load(true), 6000);
    const handleFocus = () => void load(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [load]);

  function search() {
    if (draft.from && draft.to && draft.from > draft.to) return setError('"Từ ngày" phải trước hoặc bằng "Đến ngày"');
    apply();
  }

  return (
    <>
      <PageHeader title="Đơn hàng" />
      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? 'minmax(0, 1fr) 460px' : 'minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0, minWidth: 0 }}>
          <SearchBar
            onSearch={search}
            hint={pending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', alignItems: 'center' }}>
              <input className="search" placeholder="Mã đơn, tên khách, SĐT…" value={draft.q} onChange={set('q')} style={{ flex: '1 1 200px', minWidth: 180 }} />
              <select className="select" value={draft.status} onChange={set('status')} aria-label="Trạng thái" style={{ flex: '1 1 140px', minWidth: 130 }}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select className="select" value={draft.channel} onChange={set('channel')} aria-label="Kênh bán" style={{ flex: '1 1 130px', minWidth: 120 }}>
                <option value="">Tất cả kênh</option>
                <option value="ONLINE">Online</option>
                <option value="POS">Tại quầy (POS)</option>
              </select>
              <label className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Từ <input type="date" value={draft.from} onChange={set('from')} /></label>
              <label className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Đến <input type="date" value={draft.to} onChange={set('to')} /></label>
            </div>
          </SearchBar>

          {error && <p className="form-error">{error}</p>}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã đơn</th><th>Ngày tạo</th><th>Kênh</th><th>Khách hàng</th><th>Trạng thái</th>
                  <th>Thanh toán</th><th className="num">Phải trả</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && <tr><td colSpan={7} className="muted center">Đang tải…</td></tr>}
                {!loading && data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Không có đơn hàng nào</td></tr>}
                {data?.items.map((o) => (
                  <tr
                    key={o.invoiceId}
                    onClick={() => setSelectedId(o.invoiceId)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(o.invoiceId); }}
                    tabIndex={0}
                    style={{ cursor: 'pointer', background: selectedId === o.invoiceId ? '#eef2ff' : undefined }}
                  >
                    <td><strong>#{o.invoiceId}</strong></td>
                    <td>{formatDateTime(o.invoiceDate)}</td>
                    <td>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</td>
                    <td>{o.customerName ?? 'Khách lẻ'}</td>
                    <td><OrderStatusBadge status={o.orderStatus} /></td>
                    <td>{PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}</td>
                    <td className="num">{formatVnd(o.amountPayable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
        </div>

        {selectedId !== null && (
          <aside style={{ position: 'sticky', top: 16, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', minWidth: 0, width: '100%' }}>
            <OrderDetailPanel orderId={selectedId} onClose={() => setSelectedId(null)} onChanged={() => void load(true)} />
          </aside>
        )}
      </div>
    </>
  );
}