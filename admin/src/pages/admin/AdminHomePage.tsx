import { Link } from 'react-router-dom';
import { reportService } from '../../services/report.service';
import type { RevenuePoint, TopProduct } from '../../types/report';
import { formatNumber, formatVnd, formatVndShort, lastDays, thisMonth } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../../components/common/PageHeader';
import { BarChart, LoadState, Meter, StatCard, Thumb } from '../../components/common/Widgets';

/** M15 – Bảng điều khiển Quản trị viên (Dashboard). */
export default function AdminHomePage() {
  const monthRange = thisMonth();
  const weekRange = lastDays(7);

  const { data: revMonth, loading: revLoading } = useAsync(() => reportService.revenue({ ...monthRange, groupBy: 'day' }), []);
  const { data: revWeek } = useAsync(() => reportService.revenue({ ...weekRange, groupBy: 'day' }), []);
  const { data: topProducts, loading: prodLoading } = useAsync(() => reportService.topProducts({ ...monthRange, limit: 5 }), []);
  const { data: orders } = useAsync(() => reportService.orders(monthRange), []);
  const { data: stockAlerts } = useAsync(() => reportService.stock({ threshold: 5 }), []);

  const totalNetRevenue = revMonth?.reduce((s: number, r: RevenuePoint) => s + r.netRevenue, 0) || 0;
  const totalOrders = orders?.byStatus.reduce((s: number, o: { count: number }) => s + o.count, 0) || 0;
  const lowStockCount = stockAlerts?.lowStock.length || 0;

  return (
    <>
      <PageHeader
        title="Bảng điều khiển Quản trị"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/reports" className="btn btn--primary">Xem báo cáo chi tiết</Link>
          </div>
        }
      />

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="Doanh thu thuần tháng này"
          value={formatVnd(totalNetRevenue)}
          icon="trend"
          hint={`${monthRange.from} đến nay`}
          tone="green"
        />
        <StatCard
          label="Đơn hàng tháng này"
          value={formatNumber(totalOrders)}
          icon="cart"
          hint={orders?.overduePending ? `${orders.overduePending} đơn chờ quá hạn` : 'Tất cả trạng thái'}
          tone="blue"
        />
        <StatCard
          label="Cảnh báo tồn kho"
          value={`${lowStockCount} mẫu`}
          icon="alert"
          hint="Biến thể có tồn kho ≤ 5"
          tone={lowStockCount > 0 ? 'orange' : 'green'}
        />
        <StatCard
          label="Kênh quản trị"
          value="Toàn quyền"
          icon="dashboard"
          hint="Admin Management Portal"
          tone="violet"
        />
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div>
              <h3>Doanh thu 7 ngày gần nhất</h3>
            </div>
            <Link to="/admin/reports" className="link small">Chi tiết ›</Link>
          </div>

          <LoadState loading={revLoading} error="" empty={!revLoading && (!revWeek || revWeek.length === 0)} />

          {revWeek && revWeek.length > 0 && (
            <BarChart
              data={revWeek.map((r: RevenuePoint) => ({
                label: r.period.slice(5),
                value: r.netRevenue,
              }))}
              format={formatVndShort}
            />
          )}
        </div>

        <div className="card">
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div>
              <h3>Top sản phẩm bán chạy tháng này</h3>
            </div>
            <Link to="/admin/reports" className="link small">Tất cả ›</Link>
          </div>

          <LoadState loading={prodLoading} error="" empty={!prodLoading && (!topProducts || topProducts.length === 0)} />

          {topProducts && topProducts.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {topProducts.map((p: TopProduct) => (
                    <tr key={p.productId}>
                      <td style={{ width: 48 }}><Thumb src={p.imageUrl} alt={p.productName} /></td>
                      <td>
                        <strong>{p.productName}</strong>
                        <div className="muted small">Đã bán: {formatNumber(p.quantity)} đôi</div>
                      </td>
                      <td style={{ width: 100 }}>
                        <Meter value={p.quantity} max={topProducts[0].quantity} />
                      </td>
                      <td className="num font-bold" style={{ color: '#059669' }}>
                        {formatVnd(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
