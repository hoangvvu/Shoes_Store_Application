import { type KeyboardEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { customerService } from '../../services/customer.service';
import type { CustomerFilters, CustomerListItem, Paged } from '../../types/customer';
import {
  ACCOUNT_FILTER_OPTIONS, AGE_GROUPS, EMPTY_FILTERS, GENDER_FILTER_OPTIONS, SORT_OPTIONS, SPEND_RANGES, hasActiveFilters,
} from '../../utils/customerSearch';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { genderText } from '../../utils/person';
import { PageHeader } from '../common/PageHeader';
import { Pagination } from '../tables/Pagination';
import { CustomerFormModal } from './CustomerFormModal';

const SIZE = 10;
/**
 * true: mở trang là hiện ngay danh sách (chưa lọc) rồi mới lọc khi bấm "Tìm kiếm".
 * false: mở trang chưa hiện kết quả nào, chỉ hiện sau khi bấm "Tìm kiếm".
 */
const SHOW_RESULTS_ON_OPEN = true;

interface Props {
  /** Đường dẫn gốc của khu vực, ví dụ /admin/customers hoặc /sales/customers. */
  basePath: string;
  /** Chỉ Admin được xóa mềm khách. */
  canDelete: boolean;
}

/** Dùng chung cho Admin và Bán hàng. Bộ lọc là "bản nháp" cho tới khi bấm nút Tìm kiếm. */
export function CustomerManager({ basePath, canDelete }: Props) {
  const [draft, setDraft] = useState<CustomerFilters>(EMPTY_FILTERS); // đang chọn trên giao diện
  const [applied, setApplied] = useState<CustomerFilters>(EMPTY_FILTERS); // đã bấm Tìm kiếm
  const [searched, setSearched] = useState(SHOW_RESULTS_ON_OPEN);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<CustomerListItem> | null>(null);
  const [loading, setLoading] = useState(SHOW_RESULTS_ON_OPEN);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<{ customer?: CustomerListItem } | null>(null);

  const load = useCallback(async () => {
    if (!searched) return;
    setLoading(true);
    setError('');
    try {
      setData(await customerService.list(applied, page, SIZE));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [searched, applied, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof CustomerFilters>(key: K) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [key]: e.target.value as CustomerFilters[K] }));

  function search() {
    setApplied(draft); // chỉ ở đây bộ lọc mới có hiệu lực
    setSearched(true);
    setPage(1);
  }

  function reset() {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setSearched(SHOW_RESULTS_ON_OPEN);
    setPage(1);
    if (!SHOW_RESULTS_ON_OPEN) setData(null);
  }

  const onEnter = (e: KeyboardEvent) => e.key === 'Enter' && search();
  const pending = JSON.stringify(draft) !== JSON.stringify(applied); // đã đổi bộ lọc nhưng chưa bấm Tìm kiếm

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
        <div className="adv-search">
          <input className="search adv-search__q" placeholder="Tên, số điện thoại hoặc email…" value={draft.q} onChange={set('q')} onKeyDown={onEnter} />
          <div className="adv-search__row">
            <select className="select" value={draft.gender} onChange={set('gender')} aria-label="Giới tính">
              {GENDER_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select" value={draft.ageGroup} onChange={set('ageGroup')} aria-label="Độ tuổi">
              {AGE_GROUPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select" value={draft.spend} onChange={set('spend')} aria-label="Mức mua hàng">
              {SPEND_RANGES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select" value={draft.hasAccount} onChange={set('hasAccount')} aria-label="Tài khoản">
              {ACCOUNT_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="select" value={draft.sort} onChange={set('sort')} aria-label="Sắp xếp">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Sắp xếp: {o.label}</option>)}
            </select>
            <button className="btn btn--primary adv-search__btn" onClick={search}>Tìm kiếm</button>
            {(hasActiveFilters(draft) || hasActiveFilters(applied)) && <button className="btn btn--ghost" onClick={reset}>Đặt lại</button>}
          </div>
          {pending && searched && <p className="muted adv-search__hint">Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.</p>}
        </div>

        {error && <p className="form-error">{error}</p>}
        {!searched ? (
          <p className="muted center adv-search__empty">Chọn tiêu chí rồi bấm "Tìm kiếm" để xem kết quả.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Họ tên</th><th>Số điện thoại</th><th>Email</th><th>Giới tính</th>
                    <th className="num">Tổng đã mua</th><th>Tài khoản</th><th className="actions-col" />
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={7} className="muted center">Đang tải…</td></tr>}
                  {!loading && data?.items.length === 0 && <tr><td colSpan={7} className="muted center">Không có khách hàng nào phù hợp</td></tr>}
                  {!loading &&
                    data?.items.map((c) => (
                      <tr key={c.customerId}>
                        <td><Link to={`${basePath}/${c.customerId}`} className="link">{c.fullName}</Link></td>
                        <td>{c.phone ?? '—'}</td>
                        <td>{c.email ?? '—'}</td>
                        <td>{genderText(c.gender)}</td>
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
          </>
        )}
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
