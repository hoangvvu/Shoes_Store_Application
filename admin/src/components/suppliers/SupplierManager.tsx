import { useState } from 'react';
import { supplierService } from '../../services/inventory.service';
import type { Supplier } from '../../types/inventory';
import { getErrorMessage } from '../../utils/error';
import { useAsync, useDebounced } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { LoadState } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
import { SupplierFormModal } from './SupplierFormModal';

const SIZE = 10;

interface Props {
  canDelete?: boolean;
}

/** M5 #1 – Quản lý danh bạ nhà cung cấp hàng. */
export function SupplierManager({ canDelete = true }: Props) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q.trim());
  const [modal, setModal] = useState<{ supplier?: Supplier } | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => supplierService.list({ q: search, page, size: SIZE }),
    [search, page],
  );

  async function remove(s: Supplier) {
    if (!window.confirm(`Xóa mềm nhà cung cấp "${s.supplierName}"? Các phiếu nhập cũ đã lập vẫn được bảo lưu.`)) return;
    try {
      await supplierService.remove(s.supplierId);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Nhà cung cấp"
        subtitle="Danh bạ đối tác cung ứng giày và vật tư nhập kho"
        actions={<button className="btn btn--primary" onClick={() => setModal({})}>+ Thêm nhà cung cấp</button>}
      />

      <div className="card">
        <div className="filters">
          <input
            className="search"
            placeholder="Tìm theo tên, SĐT hoặc email…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        <LoadState loading={loading} error={error} empty={!loading && data?.items.length === 0} emptyText="Không có nhà cung cấp nào" />

        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã</th>
                  <th>Tên nhà cung cấp</th>
                  <th>Số điện thoại</th>
                  <th>Email</th>
                  <th>Địa chỉ</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((s: Supplier) => (
                  <tr key={s.supplierId}>
                    <td>#{s.supplierId}</td>
                    <td><strong>{s.supplierName}</strong></td>
                    <td>{s.phone || '—'}</td>
                    <td>{s.email ? <a href={`mailto:${s.email}`} className="link">{s.email}</a> : '—'}</td>
                    <td>{s.address || '—'}</td>
                    <td className="actions">
                      <button className="btn btn--ghost" onClick={() => setModal({ supplier: s })}>Sửa</button>
                      {canDelete && (
                        <button className="btn btn--danger" onClick={() => remove(s)}>Xóa</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {modal && (
        <SupplierFormModal
          supplier={modal.supplier}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
