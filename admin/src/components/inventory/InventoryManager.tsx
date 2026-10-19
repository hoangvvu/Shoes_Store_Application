import { useState } from 'react';
import { inventoryService } from '../../services/inventory.service';
import type { StockItem } from '../../types/inventory';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { formatNumber, LOW_STOCK_THRESHOLD } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { ColorDot, LoadState } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
import { LedgerModal } from './LedgerModal';
import { StockAdjustModal } from './StockAdjustModal';

const SIZE = 10;

interface Props {
  canAdjust?: boolean;
}

interface InventoryFilters {
  q: string;
  lowStockOnly: string;
}

const EMPTY_INVENTORY_FILTERS: InventoryFilters = { q: '', lowStockOnly: '' };

/** M6 #1, #2, #3, #4 – Quản lý tồn kho theo biến thể, cảnh báo sắp hết hàng, xem thẻ kho, điều chỉnh tồn. */
export function InventoryManager({ canAdjust = true }: Props) {
  const { draft, applied, page, setPage, set, apply } = useSearchFilters<InventoryFilters>(EMPTY_INVENTORY_FILTERS);

  const [ledgerVariant, setLedgerVariant] = useState<StockItem | null>(null);
  const [adjustVariant, setAdjustVariant] = useState<StockItem | null>(null);

  const { data: lowStockItems } = useAsync(() => inventoryService.lowStock(LOW_STOCK_THRESHOLD), []);

  const isLowStockActive = applied.lowStockOnly === 'true';

  const { data, loading, error, reload } = useAsync(
    () =>
      inventoryService.list({
        q: applied.q.trim() || undefined,
        lowStockOnly: isLowStockActive,
        threshold: LOW_STOCK_THRESHOLD,
        page,
        size: SIZE,
      }),
    [applied, page],
  );

  function toggleLowStockHeader() {
    const nextVal = isLowStockActive ? '' : 'true';
    draft.lowStockOnly = nextVal;
    apply();
  }

  return (
    <>
      <PageHeader
        title="Tồn kho & Thẻ kho"
        subtitle="Theo dõi số lượng thực tế theo từng biến thể kích cỡ / màu sắc và kiểm kê điều chỉnh"
        actions={
          lowStockItems && lowStockItems.length > 0 ? (
            <button
              className={`btn ${isLowStockActive ? 'btn--primary' : 'btn--ghost'}`}
              onClick={toggleLowStockHeader}
            >
              ⚠️ Cảnh báo sắp hết hàng ({lowStockItems.length})
            </button>
          ) : undefined
        }
      />

      <div className="card">
        <SearchBar onSearch={apply}>
          <input
            className="search"
            placeholder="Tìm theo mã SKU, tên giày..."
            value={draft.q}
            onChange={set('q')}
          />
          <select
            className="select"
            value={draft.lowStockOnly}
            onChange={set('lowStockOnly')}
            aria-label="Lọc mức tồn kho"
          >
            <option value="">Tất cả mức tồn</option>
            <option value="true">Sắp hết hàng (≤ {LOW_STOCK_THRESHOLD} đôi)</option>
          </select>
        </SearchBar>

        <LoadState loading={loading} error={error} empty={!loading && data?.items.length === 0} emptyText="Không tìm thấy biến thể nào trong kho" />

        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>Kích cỡ</th>
                  <th>Màu sắc</th>
                  <th className="num">Số lượng tồn</th>
                  <th>Tình trạng</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: StockItem) => {
                  const isOutOfStock = item.stockQuantity <= 0;
                  const isLowStock = item.stockQuantity <= LOW_STOCK_THRESHOLD;

                  return (
                    <tr key={item.variantId}>
                      <td><code>{item.sku}</code></td>
                      <td>
                        <strong>{item.productName}</strong>
                        <div className="muted small">#{item.variantId} · {item.categoryName || 'Chưa phân loại'}</div>
                      </td>
                      <td><span className="badge badge--ok">Size {item.sizeLabel}</span></td>
                      <td><ColorDot hex={item.hexCode} name={item.colorName} /></td>
                      <td className="num font-bold">
                        <span className={`badge ${isOutOfStock ? 'badge--danger' : isLowStock ? 'badge--warning' : 'badge--ok'}`}>
                          {formatNumber(item.stockQuantity)} đôi
                        </span>
                      </td>
                      <td>
                        {isOutOfStock ? (
                          <span className="badge badge--danger">Hết hàng</span>
                        ) : isLowStock ? (
                          <span className="badge badge--warning">Sắp hết hàng</span>
                        ) : (
                          <span className="badge badge--ok">Còn hàng</span>
                        )}
                      </td>
                      <td className="actions">
                        <button className="btn btn--ghost" onClick={() => setLedgerVariant(item)}>Thẻ kho</button>
                        {canAdjust && (
                          <button className="btn btn--ghost" onClick={() => setAdjustVariant(item)}>Điều chỉnh</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {ledgerVariant && (
        <LedgerModal
          variant={ledgerVariant}
          onClose={() => setLedgerVariant(null)}
        />
      )}

      {adjustVariant && (
        <StockAdjustModal
          variant={adjustVariant}
          onClose={() => setAdjustVariant(null)}
          onSaved={() => {
            setAdjustVariant(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
