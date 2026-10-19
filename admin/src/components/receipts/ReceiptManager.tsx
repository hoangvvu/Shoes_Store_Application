import { useState } from 'react';
import { receiptService, supplierService } from '../../services/inventory.service';
import type { ReceiptListItem, Supplier } from '../../types/inventory';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime, formatNumber, formatVnd, lastDays } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { DateRangeFilter, LoadState } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
import { ReceiptCreateModal } from './ReceiptCreateModal';
import { ReceiptDetailModal } from './ReceiptDetailModal';

const SIZE = 10;

interface Props {
  canDelete?: boolean;
}

/** M5 #3, #5 – Danh sách phiếu nhập kho, lọc theo ngày/nhà cung cấp, xem chi tiết, hoàn tác xóa mềm. */
export function ReceiptManager({ canDelete = true }: Props) {
  const [range, setRange] = useState(lastDays(60));
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [page, setPage] = useState(1);

  const [createModal, setCreateModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  const { data: suppliers } = useAsync(() => supplierService.list({ page: 1, size: 100 }), []);

  const { data, loading, error, reload } = useAsync(
    () =>
      receiptService.list({
        from: range.from,
        to: range.to,
        supplierId: supplierId === '' ? undefined : supplierId,
        page,
        size: SIZE,
      }),
    [range, supplierId, page],
  );

  async function removeReceipt(r: ReceiptListItem) {
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

  return (
    <>
      <PageHeader
        title="Phiếu nhập kho"
        subtitle="Quản lý lịch sử nhập hàng từ nhà cung cấp và tăng tồn kho tự động"
        actions={<button className="btn btn--primary" onClick={() => setCreateModal(true)}>+ Lập phiếu nhập kho</button>}
      />

      <div className="card">
        <div className="filters">
          <DateRangeFilter
            value={range}
            onChange={(r) => { setRange(r); setPage(1); }}
          />
          <select
            className="select"
            value={supplierId}
            onChange={(e) => { setSupplierId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          >
            <option value="">Tất cả nhà cung cấp</option>
            {suppliers?.items.map((s: Supplier) => (
              <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
            ))}
          </select>
        </div>

        <LoadState loading={loading} error={error} empty={!loading && data?.items.length === 0} emptyText="Không có phiếu nhập kho nào trong kỳ" />

        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Mã phiếu</th>
                  <th>Thời gian nhập</th>
                  <th>Nhà cung cấp</th>
                  <th>Người lập</th>
                  <th className="num">Số mặt hàng</th>
                  <th className="num">Tổng tiền nhập</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((r: ReceiptListItem) => (
                  <tr key={r.receiptId}>
                    <td><strong>#{r.receiptId}</strong></td>
                    <td>{formatDateTime(r.receiptDate)}</td>
                    <td><strong>{r.supplierName}</strong></td>
                    <td>{r.employeeName}</td>
                    <td className="num">{formatNumber(r.itemCount || 0)} dòng</td>
                    <td className="num font-bold" style={{ color: '#059669' }}>
                      {formatVnd(r.totalAmount)}
                    </td>
                    <td className="actions">
                      <button className="btn btn--ghost" onClick={() => setSelectedReceiptId(r.receiptId)}>Chi tiết</button>
                      {canDelete && (
                        <button className="btn btn--danger" onClick={() => removeReceipt(r)}>Hủy phiếu</button>
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
