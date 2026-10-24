import { useState } from 'react';
import { inventoryService } from '../../services/inventory.service';
import type { LedgerEntry, StockItem } from '../../types/inventory';
import { formatDateTime, formatNumber, lastDays, TXN_LABEL } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { DateRangeFilter, LoadState } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';

interface Props {
  variant: StockItem;
  onClose: () => void;
}

const SIZE = 10;

/** M6 #2 – Thẻ kho: truy vết toàn bộ biến động kho của 1 biến thể (chứng từ, tồn trước/sau, người thực hiện). */
export function LedgerModal({ variant, onClose }: Props) {
  const [range, setRange] = useState(lastDays(90));
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAsync(
    () =>
      inventoryService.ledger(variant.variantId, {
        from: range.from,
        to: range.to,
        page,
        size: SIZE,
      }),
    [variant.variantId, range, page],
  );

  return (
    <Modal title={`Thẻ kho: ${variant.sku}`} onClose={onClose} wide>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{variant.productName}</h4>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Kích cỡ: <strong>{variant.sizeLabel}</strong> · Màu sắc: <strong>{variant.colorName}</strong> · Tồn kho hiện tại: <span className="badge badge--ok">{formatNumber(variant.stockQuantity)}</span>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 14 }}>
        <DateRangeFilter value={range} onChange={(r) => { setRange(r); setPage(1); }} />
      </div>

      <LoadState loading={loading} error={error} empty={!loading && data?.items.length === 0} emptyText="Không có biến động kho nào trong khoảng thời gian này" />

      {data && data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Loại giao dịch</th>
                <th>Chứng từ liên quan</th>
                <th className="num">Biến động</th>
                <th className="num">Tồn trước</th>
                <th className="num font-bold">Tồn sau</th>
                <th>Người thực hiện / Lý do</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry: LedgerEntry) => {
                const isPos = entry.quantityChange > 0;
                return (
                  <tr key={entry.transactionId}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>
                      <span className={`badge ${isPos ? 'badge--ok' : 'badge--danger'}`}>
                        {TXN_LABEL[entry.transactionType] || entry.transactionType}
                      </span>
                    </td>
                    <td>
                      {entry.purchaseReceiptId && <span>Phiếu nhập #{entry.purchaseReceiptId}</span>}
                      {entry.invoiceId && <span>Đơn hàng #{entry.invoiceId}</span>}
                      {entry.returnId && <span>Đổi trả #{entry.returnId}</span>}
                      {!entry.purchaseReceiptId && !entry.invoiceId && !entry.returnId && <span className="muted">Kiểm kê / Điều chỉnh</span>}
                    </td>
                    <td className="num font-bold" style={{ color: isPos ? '#168a4f' : '#dc2626' }}>
                      {isPos ? `+${formatNumber(entry.quantityChange)}` : formatNumber(entry.quantityChange)}
                    </td>
                    <td className="num">{formatNumber(entry.stockBefore)}</td>
                    <td className="num font-bold">{formatNumber(entry.stockAfter)}</td>
                    <td>
                      <div>{entry.createdByName || <span className="muted">Hệ thống</span>}</div>
                      {entry.reason && <small className="muted">{entry.reason}</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}

      <div className="form__actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn--primary" onClick={onClose}>Đóng</button>
      </div>
    </Modal>
  );
}
