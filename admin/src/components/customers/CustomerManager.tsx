import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../../services/customer.service';
import type { CustomerListItem, Paged } from '../../types/customer';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { PageHeader } from '../common/PageHeader';
import { Pagination } from '../tables/Pagination';
import { CustomerFormModal } from './CustomerFormModal';

const SIZE = 10;

interface Props {
  /** Đường dẫn gốc của khu vực, ví dụ /admin/customers hoặc /sales/customers. */
  basePath: string;
  /** Chỉ Admin được xóa mềm khách. */
  canDelete: boolean;
}

/** Dùng chung cho Admin và Bán hàng (cùng service, khác quyền xóa). */
export function CustomerManager({ basePath, canDelete }: Props) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<CustomerListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ customer?: CustomerListItem } | null>(null);

  // debounce ô tìm kiếm
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
      setData(await customerService.list({ q: search, page, size: SIZE }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(c: CustomerListItem) {
    if (!window.confirm(`Xóa mềm khách "${c.fullName}"? Tài khoản liên kết cũng sẽ bị xóa, lịch sử đơn được giữ nguyên.`)) return;
    try {
      await customerService.remove(c.customerId);
      await load();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Khách hàng"
        subtitle="Danh sách và thông tin khách hàng"
        actions={<button className="btn btn--primary" onClick={() => setModal({})}>+ Thêm khách tại quầy</button>}
      />

      <div className="card">
        <input className="search" placeholder="Tìm theo tên hoặc số điện thoại…" value={q} onChange={(e) => setQ(e.target.value)} />

        {error && <p className="form-error">{error}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Số điện thoại</th>
                <th className="num">Tổng đã mua</th>
                <th>Tài khoản</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="muted center">Đang tải…</td></tr>}
              {!loading && data?.items.length === 0 && <tr><td colSpan={5} className="muted center">Không có khách hàng nào</td></tr>}
              {!loading &&
                data?.items.map((c) => (
                  <tr key={c.customerId}>
                    <td><Link to={`${basePath}/${c.customerId}`} className="link">{c.fullName}</Link></td>
                    <td>{c.phone ?? '—'}</td>
                    <td className="num">{formatVnd(c.totalPurchased)}</td>
                    <td><span className={`badge ${c.hasAccount ? 'badge--ok' : 'badge--muted'}`}>{c.hasAccount ? 'Có tài khoản' : 'Tại quầy'}</span></td>
                    <td className="actions">
                      <Link to={`${basePath}/${c.customerId}`} className="btn btn--ghost">Xem</Link>
                      <button className="btn btn--ghost" onClick={() => setModal({ customer: c })}>Sửa</button>
                      {canDelete && <button className="btn btn--danger" onClick={() => remove(c)}>Xóa</button>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {modal && (
        <CustomerFormModal
          customer={modal.customer}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void load();
          }}
        />
      )}
    </>
  );
}
