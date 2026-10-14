import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../services/order.service';
import type { Paged } from '../../types/customer';
import type { Channel, OrderListItem, OrderStatus } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatVnd } from '../../utils/format';
import { PAYMENT_STATUS_LABEL, STATUS_OPTIONS } from '../../utils/order';
import { PageHeader } from '../common/PageHeader';
import { Pagination } from '../tables/Pagination';
import { OrderStatusBadge } from './OrderStatusBadge';

const SIZE = 10;

/** Danh sách đơn dùng chung cho Admin và Bán hàng. */
export function OrderManager({ basePath }: { basePath: string }) {
  const [status, setStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<OrderListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await orderService.list({
          status: (status || undefined) as OrderStatus | undefined,
          channel: (channel || undefined) as Channel | undefined,
          from: from || undefined,
          to: to || undefined,
          q: search,
          page,
          size: SIZE,
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, channel, from, to, search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = (setter: (v: string) => void) => (e: { target: { value: string } }) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Đơn hàng" subtitle="Theo dõi và xử lý đơn hàng online và bán tại quầy" />
      <div className="card">
        <div className="filters">
          <input className="search" placeholder="Mã đơn, tên khách, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={status} onChange={reset(setStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select" value={channel} onChange={reset(setChannel)}>
            <option value="">Tất cả kênh</option>
            <option value="ONLINE">Online</option>
            <option value="POS">Tại quầy (POS)</option>
          </select>
          <label className="date-filter">Từ <input type="date" value={from} onChange={reset(setFrom)} /></label>
          <label className="date-filter">Đến <input type="date" value={to} onChange={reset(setTo)} /></label>
        </div>

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
