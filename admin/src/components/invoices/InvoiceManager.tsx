import { useCallback, useEffect, useState } from 'react';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { invoiceService } from '../../services/invoice.service';
import type { Paged } from '../../types/customer';
import type { Channel, InvoiceSummary, InvoiceType, OrderListItem } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatVnd } from '../../utils/format';
import { INVOICE_TYPE_OPTIONS } from '../../utils/order';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { Pagination } from '../tables/Pagination';
import { PaymentBadge } from './InvoiceBadges';
import { InvoiceDetailPanel } from './InvoiceDetailPanel';

const SIZE = 10;

interface Filters {
  q: string;
  type: string;
  channel: string;
  from: string;
  to: string;
}
const EMPTY: Filters = { q: '', type: '', channel: '', from: '', to: '' };

/** Quản lý hóa đơn: danh sách bên trái, chi tiết hiện ở ô bên phải khi bấm vào dòng. */
export function InvoiceManager(_props: { basePath?: string }) {
  const { draft, applied, page, setPage, set, apply, pending } = useSearchFilters<Filters>(EMPTY);
  const [data, setData] = useState<(Paged<OrderListItem> & { summary?: InvoiceSummary }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError('');
    try {
      const result = await invoiceService.list({
        type: (applied.type || undefined) as InvoiceType | undefined,
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

  const s = data?.summary;
  return (
    <>
      <PageHeader title="Hóa đơn" subtitle="Hóa đơn đã hoàn thành thanh toán và hóa đơn đã hoàn tiền" />

      {s && (
        <div className="stat-cards">
          <div className="stat-card"><span className="muted">Số hóa đơn</span><strong>{s.count}</strong></div>
          <div className="stat-card"><span className="muted">Đã thu</span><strong>{formatVnd(s.paidTotal)}</strong></div>
          <div className="stat-card stat-card--refund"><span className="muted">Đã hoàn tiền</span><strong>{formatVnd(s.refundedTotal)}</strong></div>
          <div className="stat-card stat-card--net"><span className="muted">Doanh thu thực</span><strong>{formatVnd(s.netTotal)}</strong></div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedId ? 'minmax(0, 1fr) 460px' : 'minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0, minWidth: 0 }}>
          <SearchBar
            onSearch={search}
            hint={pending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%', alignItems: 'center' }}>
              <input className="search" placeholder="Mã hóa đơn, tên khách, SĐT…" value={draft.q} onChange={set('q')} style={{ flex: '1 1 200px', minWidth: 180 }} />
              <select className="select" value={draft.type} onChange={set('type')} aria-label="Loại hóa đơn" style={{ flex: '1 1 140px', minWidth: 130 }}>
                {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                  <th>Mã HĐ</th><th>Ngày lập</th><th>Kênh</th><th>Khách hàng</th><th>Thanh toán</th>
                  <th className="num">Phải trả</th><th className="num">Đã hoàn</th><th className="num">Thực thu</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && <tr><td colSpan={8} className="muted center">Đang tải…</td></tr>}
                {!loading && data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Không có hóa đơn nào</td></tr>}
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
                    <td><PaymentBadge status={o.paymentStatus} /></td>
                    <td className="num">{formatVnd(o.amountPayable)}</td>
                    <td className="num">{o.refundedAmount > 0 ? <span className="amount-refund">-{formatVnd(o.refundedAmount)}</span> : '—'}</td>
                    <td className="num"><strong>{formatVnd(o.paidAmount - o.refundedAmount)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
        </div>

        {selectedId !== null && (
          <aside style={{ position: 'sticky', top: 16, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', minWidth: 0, width: '100%' }}>
            <InvoiceDetailPanel invoiceId={selectedId} onClose={() => setSelectedId(null)} />
          </aside>
        )}
      </div>
    </>
  );
}