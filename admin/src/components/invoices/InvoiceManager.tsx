import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { CompletionBadge, PaymentBadge } from './InvoiceBadges';

const SIZE = 10;

interface Filters {
  q: string;
  type: string;
  channel: string;
  from: string;
  to: string;
}
const EMPTY: Filters = { q: '', type: '', channel: '', from: '', to: '' };

/**
 * Quản lý hóa đơn: đơn đã hoàn thành + đã thanh toán, và đơn đã hoàn tiền (một phần / toàn bộ) – không bỏ sót.
 * Đơn đang xử lý hoặc chưa thu đủ tiền nằm ở màn "Đơn hàng". Bộ lọc chỉ có hiệu lực khi bấm "Tìm kiếm".
 */
export function InvoiceManager({ basePath }: { basePath: string }) {
  const { draft, applied, page, setPage, set, apply, pending } = useSearchFilters<Filters>(EMPTY);
  const [data, setData] = useState<(Paged<OrderListItem> & { summary?: InvoiceSummary }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await invoiceService.list({
          type: (applied.type || undefined) as InvoiceType | undefined,
          channel: (applied.channel || undefined) as Channel | undefined,
          from: applied.from || undefined,
          to: applied.to || undefined,
          q: applied.q.trim(),
          page,
          size: SIZE,
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function search() {
    if (draft.from && draft.to && draft.from > draft.to) return setError('"Từ ngày" phải trước hoặc bằng "Đến ngày"');
    apply();
  }

  const s = data?.summary;
  return (
    <>
      <PageHeader title="Hóa đơn" />

      {s && (
        <div className="stat-cards">
          <div className="stat-card"><span className="muted">Số hóa đơn</span><strong>{s.count}</strong></div>
          <div className="stat-card"><span className="muted">Đã thu</span><strong>{formatVnd(s.paidTotal)}</strong></div>
          <div className="stat-card stat-card--refund"><span className="muted">Đã hoàn tiền</span><strong>{formatVnd(s.refundedTotal)}</strong></div>
          <div className="stat-card stat-card--net"><span className="muted">Doanh thu thực</span><strong>{formatVnd(s.netTotal)}</strong></div>
        </div>
      )}

      <div className="card">
        <SearchBar
          onSearch={search}
          hint={pending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}
        >
          <input className="search" placeholder="Mã hóa đơn, tên khách, SĐT…" value={draft.q} onChange={set('q')} />
          <select className="select" value={draft.type} onChange={set('type')} aria-label="Loại hóa đơn">
            {INVOICE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select" value={draft.channel} onChange={set('channel')} aria-label="Kênh bán">
            <option value="">Tất cả kênh</option>
            <option value="ONLINE">Online</option>
            <option value="POS">Tại quầy (POS)</option>
          </select>
          <label className="date-filter">Từ <input type="date" value={draft.from} onChange={set('from')} /></label>
          <label className="date-filter">Đến <input type="date" value={draft.to} onChange={set('to')} /></label>
        </SearchBar>

        {error && <p className="form-error">{error}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mã HĐ</th><th>Ngày lập</th><th>Kênh</th><th>Khách hàng</th><th>Đơn hàng</th><th>Thanh toán</th>
                <th className="num">Phải trả</th><th className="num">Đã hoàn</th><th className="num">Thực thu</th><th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="muted center">Đang tải…</td></tr>}
              {!loading && data?.items.length === 0 && <tr><td colSpan={10} className="muted center">Không có hóa đơn nào</td></tr>}
              {!loading &&
                data?.items.map((o) => (
                  <tr key={o.invoiceId}>
                    <td><Link to={`${basePath}/${o.invoiceId}`} className="link">#{o.invoiceId}</Link></td>
                    <td>{formatDateTime(o.invoiceDate)}</td>
                    <td>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</td>
                    <td>{o.customerName ?? 'Khách lẻ'}</td>
                    <td><CompletionBadge status={o.orderStatus} /></td>
                    <td><PaymentBadge status={o.paymentStatus} /></td>
                    <td className="num">{formatVnd(o.amountPayable)}</td>
                    <td className="num">{o.refundedAmount > 0 ? <span className="amount-refund">-{formatVnd(o.refundedAmount)}</span> : '—'}</td>
                    <td className="num"><strong>{formatVnd(o.paidAmount - o.refundedAmount)}</strong></td>
                    <td className="actions"><Link to={`${basePath}/${o.invoiceId}`} className="btn btn--ghost">Xem</Link></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>
    </>
  );
}
