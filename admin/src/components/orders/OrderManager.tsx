import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

/** Danh sách đơn dùng chung cho Admin và Bán hàng. Bộ lọc chỉ có hiệu lực khi bấm "Tìm kiếm". */
export function OrderManager({ basePath }: { basePath: string }) {
  // draft = đang chọn trên giao diện; applied = đã bấm Tìm kiếm; tất cả về mặc định thì tự về danh sách đầy đủ
  const { draft, applied, page, setPage, set, apply, pending } = useSearchFilters<Filters>(EMPTY);
  const [data, setData] = useState<Paged<OrderListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await orderService.list({
          status: (applied.status || undefined) as OrderStatus | undefined,
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

  return (
    <>
      <PageHeader title="Đơn hàng" subtitle="Theo dõi và xử lý đơn hàng online và bán tại quầy" />
      <div className="card">
        <SearchBar
          onSearch={search}
          hint={pending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}
        >
          <input className="search" placeholder="Mã đơn, tên khách, SĐT…" value={draft.q} onChange={set('q')} />
          <select className="select" value={draft.status} onChange={set('status')} aria-label="Trạng thái">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                <th>Mã đơn</th><th>Ngày tạo</th><th>Kênh</th><th>Khách hàng</th><th>Trạng thái</th>
                <th>Thanh toán</th><th className="num">Phải trả</th><th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="muted center">Đang tải…</td></tr>}
              {!loading && data?.items.length === 0 && <tr><td colSpan={8} className="muted center">Không có đơn hàng nào</td></tr>}
              {!loading &&
                data?.items.map((o) => (
                  <tr key={o.invoiceId}>
                    <td><Link to={`${basePath}/${o.invoiceId}`} className="link">#{o.invoiceId}</Link></td>
                    <td>{formatDateTime(o.invoiceDate)}</td>
                    <td>{o.channel === 'POS' ? 'Tại quầy' : 'Online'}</td>
                    <td>{o.customerName ?? 'Khách lẻ'}</td>
                    <td><OrderStatusBadge status={o.orderStatus} /></td>
                    <td>{PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}</td>
                    <td className="num">{formatVnd(o.amountPayable)}</td>
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
