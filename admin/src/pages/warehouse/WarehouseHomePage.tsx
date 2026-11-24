import { Link } from 'react-router-dom';
import { inventoryService } from '../../services/inventory.service';
import { reportService } from '../../services/report.service';
import type { StockItem } from '../../types/inventory';
import { formatNumber, LOW_STOCK_THRESHOLD } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadState, StatCard } from '../../components/common/Widgets';

/** Dashboard dành riêng cho bộ phận Kho (M6, M15). */
export default function WarehouseHomePage() {
  const { data: lowStockItems, loading } = useAsync(() => inventoryService.lowStock(LOW_STOCK_THRESHOLD), []);
  const { data: stockReport } = useAsync(() => reportService.stock({ threshold: LOW_STOCK_THRESHOLD }), []);

  const lowCount = lowStockItems?.length || 0;
  const staleCount = stockReport?.staleStock.length || 0;

  return (
    <>
      <PageHeader
        title="Bảng điều khiển Kho hàng"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/warehouse/receipts" className="btn btn--primary">Lập phiếu nhập kho</Link>
          </div>
        }
      />

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Cảnh báo sắp hết hàng"
          value={`${lowCount} mẫu`}
          icon="alert"
          hint="Số lượng tồn kho ≤ 5 đôi"
          tone={lowCount > 0 ? 'orange' : 'green'}
        />
        <StatCard
          label="Tồn đọng lâu ngày"
          value={`${staleCount} mẫu`}
          icon="warehouse"
          hint="Không có biến động > 30 ngày"
          tone="blue"
        />
        <StatCard
          label="Vai trò vận hành"
          value="Thủ kho"
          icon="clipboard"
          hint="WAREHOUSE Role"
          tone="violet"
        />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h3>Mặt hàng sắp hết hàng cần nhập bổ sung</h3>
          </div>
          <Link to="/warehouse/inventory" className="link small">Tất cả kho ›</Link>
        </div>

        <LoadState loading={loading} error="" empty={!loading && lowCount === 0} emptyText="Tất cả các mặt hàng đều đang đủ tồn kho an toàn" />

        {lowStockItems && lowStockItems.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>Kích cỡ</th>
                  <th>Màu sắc</th>
                  <th className="num">Tồn hiện tại</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {lowStockItems.slice(0, 8).map((item: StockItem) => (
                  <tr key={item.variantId}>
                    <td><code>{item.sku}</code></td>
                    <td><strong>{item.productName}</strong></td>
                    <td><span className="badge badge--ok">Size {item.sizeLabel}</span></td>
                    <td>{item.colorName}</td>
                    <td className="num font-bold">
                      <span className="badge badge--danger">{formatNumber(item.stockQuantity)} đôi</span>
                    </td>
                    <td className="actions">
                      <Link to="/warehouse/receipts" className="btn btn--primary">Nhập hàng</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
