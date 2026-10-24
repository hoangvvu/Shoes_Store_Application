import { useState } from 'react';
import { receiptService, supplierService } from '../../services/inventory.service';
import type { ReceiptListItem, Supplier } from '../../types/inventory';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatNumber, formatVnd, lastDays } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { LoadState } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
import { ReceiptCreateModal } from './ReceiptCreateModal';
import { ReceiptDetailModal } from './ReceiptDetailModal';

const SIZE = 10;
const DEFAULT_RANGE = lastDays(60);

interface Props {
  canDelete?: boolean;
}

interface ReceiptFilters {
  from: string;
  to: string;
  supplierId: string;
  status: 'ALL' | 'ACTIVE' | 'DELETED';
}

const EMPTY_RECEIPT_FILTERS: ReceiptFilters = {
  from: DEFAULT_RANGE.from,
  to: DEFAULT_RANGE.to,
  supplierId: '',
  status: 'ALL',
};

/** M5 #3, #5 – Danh sách phiếu nhập kho, lọc theo ngày/nhà cung cấp, xem chi tiết, hoàn tác xóa mềm. */
export function ReceiptManager({ canDelete = true }: Props) {
  const { draft, applied, page, setPage, set, apply } = useSearchFilters<ReceiptFilters>(EMPTY_RECEIPT_FILTERS);

  const [createModal, setCreateModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const { data: suppliers } = useAsync(() => supplierService.list({ page: 1, size: 100 }), []);

  const { data, loading, error, reload } = useAsync(
    () =>
      receiptService.list({
        from: applied.from || undefined,
        to: applied.to || undefined,
        supplierId: applied.supplierId ? Number(applied.supplierId) : undefined,
        status: applied.status !== 'ALL' ? applied.status : undefined,
        page,
        size: SIZE,
      }),
    [applied, page],
  );

  function handleSearch() {
    if (draft.from && draft.to && draft.from > draft.to) {
      window.alert('"Từ ngày" phải trước hoặc bằng "Đến ngày"');
      return;
    }
    apply();
  }

  async function removeReceipt(r: ReceiptListItem) {
    if (r.isDeleted) {
      window.alert('Phiếu nhập này đã được hủy trước đó.');
      return;
    }

    const reason = window.prompt(
      `Xóa mềm phiếu nhập #${r.receiptId} từ "${r.supplierName}"?\nThao tác này sẽ ghi bút toán hoàn tác (IMPORT_REVERSAL) trừ lại tồn kho tương ứng.\nVui lòng nhập lý do hủy:`,
    );
    if (!reason || !reason.trim()) return;

    try {
      await receiptService.remove(r.receiptId, reason.trim());
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  const activeTotalAmount = (data?.items || [])
    .filter((r: ReceiptListItem) => !r.isDeleted)
    .reduce((sum: number, r: ReceiptListItem) => sum + r.totalAmount, 0);

  const activeTotalQty = (data?.items || [])
    .filter((r: ReceiptListItem) => !r.isDeleted)
    .reduce((sum: number, r: ReceiptListItem) => sum + (r.totalQuantity || 0), 0);

  return (
    <>
      <PageHeader
        title="Phiếu nhập kho"
        subtitle="Quản lý lịch sử nhập hàng từ nhà cung cấp và tăng tồn kho tự động"
        actions={<button className="btn btn--primary" onClick={() => setCreateModal(true)}>+ Lập phiếu nhập kho</button>}
      />

      <div className="card">
        <SearchBar onSearch={handleSearch}>
          <label className="date-filter">Từ <input type="date" value={draft.from} onChange={set('from')} /></label>
          <label className="date-filter">Đến <input type="date" value={draft.to} onChange={set('to')} /></label>
          <select
            className="select"
            value={draft.supplierId}
            onChange={set('supplierId')}
            aria-label="Lọc nhà cung cấp"
          >
            <option value="">Tất cả nhà cung cấp</option>
            {suppliers?.items.map((s: Supplier) => (
              <option key={s.supplierId} value={String(s.supplierId)}>{s.supplierName}</option>
            ))}
          </select>
          <select
            className="select"
            value={draft.status}
            onChange={set('status')}
            aria-label="Lọc trạng thái phiếu"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Hiệu lực (Hoàn thành)</option>
            <option value="DELETED">Đã hủy (Hoàn tác tồn)</option>
          </select>
        </SearchBar>

        <LoadState loading={loading} error={error} empty={!loading && data?.items.length === 0} emptyText="Không có phiếu nhập kho nào trong kỳ" />

        {data && data.items.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, color: '#475569' }}>
              <span>Tổng số phiếu trang này: <strong>{data.items.length}</strong> (Tổng cộng: {data.total})</span>
              <span>•</span>
              <span>Tổng số lượng nhập hiệu lực: <strong style={{ color: '#0369a1' }}>{formatNumber(activeTotalQty)} đôi</strong></span>
              <span>•</span>
              <span>Tổng tiền nhập hiệu lực: <strong style={{ color: '#059669' }}>{formatVnd(activeTotalAmount)}</strong></span>
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Mã phiếu</th>
                    <th>Thời gian nhập</th>
                    <th>Nhà cung cấp</th>
                    <th>Người lập</th>
                    <th>Trạng thái</th>
                    <th className="num">SL nhập</th>
                    <th className="num">Tổng tiền nhập</th>
                    <th className="actions-col" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r: ReceiptListItem) => (
                    <tr
                      key={r.receiptId}
                      style={{
                        backgroundColor: r.isDeleted ? '#fafafa' : undefined,
                        opacity: r.isDeleted ? 0.75 : 1,
                      }}
                    >
                      <td><strong>#{r.receiptId}</strong></td>
                      <td>{formatDateTime(r.receiptDate)}</td>
                      <td><strong>{r.supplierName}</strong></td>
                      <td>{r.employeeName}</td>
                      <td>
                        {r.isDeleted ? (
                          <span className="badge badge--danger">Đã hủy</span>
                        ) : (
                          <span className="badge badge--ok">Hoàn thành</span>
                        )}
                      </td>
                      <td className="num">
                        {r.totalQuantity ? `${formatNumber(r.totalQuantity)} đôi` : `${r.itemCount} dòng`}
                      </td>
                      <td className="num font-bold">
                        {r.isDeleted ? (
                          <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                            {formatVnd(r.totalAmount)}
                          </span>
                        ) : (
                          <span style={{ color: '#059669' }}>
                            {formatVnd(r.totalAmount)}
                          </span>
                        )}
                      </td>
                      <td className="actions">
                        <button className="btn btn--ghost" onClick={() => setSelectedReceiptId(r.receiptId)}>
                          Chi tiết
                        </button>
                        {canDelete && !r.isDeleted && (
                          <button className="btn btn--danger" onClick={() => removeReceipt(r)}>
                            Hủy phiếu
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {createModal && (
        <ReceiptCreateModal
          onClose={() => setCreateModal(false)}
          onSaved={() => {
            setCreateModal(false);
            void reload();
          }}
        />
      )}

      {selectedReceiptId !== null && (
        <ReceiptDetailModal
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}
    </>
  );
}
