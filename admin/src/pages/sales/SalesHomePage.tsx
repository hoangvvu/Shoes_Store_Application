import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/common/PageHeader';
import { LoadState, Meter, StatCard, Thumb } from '../../components/common/Widgets';
import { reportService } from '../../services/report.service';
import type { TopProduct } from '../../types/report';
import { formatNumber, formatVnd, thisMonth } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

export default function SalesHomePage() {
  const monthRange = thisMonth();
  const { data: topProducts, loading: prodLoading } = useAsync(() => reportService.topProducts({ ...monthRange, limit: 5 }), []);
  const { data: orders, loading: ordLoading } = useAsync(() => reportService.orders(monthRange), []);

  const totalOrders = orders?.byStatus.reduce((s: number, o: { count: number }) => s + o.count, 0) || 0;
  const pendingOrders = orders?.byStatus.find((o) => o.status === 'PENDING')?.count || 0;

  return (
    <>
      <PageHeader
        title="Bảng điều khiển Bán hàng"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/sales/orders" className="btn btn--primary">Xử lý đơn hàng</Link>
          </div>
        }
      />

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Đơn hàng tháng này"
          value={formatNumber(totalOrders)}
          icon="cart"
          hint="Đơn hàng phát sinh"
          tone="blue"
        />
        <StatCard
          label="Đơn chờ xử lý"
          value={formatNumber(pendingOrders)}
          icon="alert"
          hint="Cần xác nhận sớm"
          tone={pendingOrders > 0 ? 'orange' : 'green'}
        />
        <StatCard
          label="Kênh bán hàng"
          value="Online & POS"
          icon="store"
          hint="SALES Management"
          tone="violet"
        />
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 16 }}>
          <div>
            <h3>Sản phẩm bán chạy nhất tháng này</h3>
          </div>
          <Link to="/sales/products" className="link small">Xem kho giày ›</Link>
        </div>

        <LoadState loading={prodLoading || ordLoading} error="" empty={!prodLoading && (!topProducts || topProducts.length === 0)} />

        {topProducts && topProducts.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th className="num">SL đã bán</th>
                  <th style={{ width: 140 }}>Độ hot</th>
                  <th className="num font-bold">Doanh số</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p: TopProduct) => (
                  <tr key={p.productId}>
                    <td><Thumb src={p.imageUrl} alt={p.productName} /></td>
                    <td>
                      <Link to={`/sales/products/${p.productId}`} className="link">{p.productName}</Link>
                    </td>
                    <td className="num font-bold">{formatNumber(p.quantity)} đôi</td>
                    <td><Meter value={p.quantity} max={topProducts[0].quantity} /></td>
                    <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(p.revenue)}</td>
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
