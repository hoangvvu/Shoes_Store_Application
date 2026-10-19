import { useState } from 'react';
import { reportService } from '../../services/report.service';
import type { EmployeeRole } from '../../types/auth';
import type {
  EmployeeSales,
  InventoryMovementRow,
  ReportKey,
  ReturnRate,
  RevenuePoint,
  TopCustomer,
  TopProduct,
} from '../../types/report';
import { formatNumber, formatVnd, formatVndShort, lastDays } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { BarChart, DateRangeFilter, LoadState, Meter, StatCard, Tabs, Thumb } from '../common/Widgets';

interface Props {
  role: EmployeeRole;
}

export function ReportsManager({ role }: Props) {
  const [range, setRange] = useState(lastDays(30));
  const [tab, setTab] = useState<ReportKey>(role === 'WAREHOUSE' ? 'inventory-movement' : 'revenue');
  const [exporting, setExporting] = useState(false);

  // Tab availability based on role
  const availableTabs: { key: ReportKey; label: string }[] =
    role === 'ADMIN'
      ? [
          { key: 'revenue', label: 'Doanh thu thuần' },
          { key: 'top-products', label: 'Sản phẩm bán chạy' },
          { key: 'orders', label: 'Trạng thái đơn hàng' },
          { key: 'inventory-movement', label: 'Nhập – Xuất – Tồn' },
          { key: 'stock', label: 'Cảnh báo tồn kho' },
          { key: 'top-customers', label: 'Khách hàng thân thiết' },
          { key: 'employees', label: 'Doanh số nhân viên' },
          { key: 'returns', label: 'Tỷ lệ đổi trả' },
        ]
      : role === 'WAREHOUSE'
        ? [
            { key: 'inventory-movement', label: 'Nhập – Xuất – Tồn' },
            { key: 'stock', label: 'Cảnh báo tồn kho' },
          ]
        : [
            { key: 'top-products', label: 'Sản phẩm bán chạy' },
            { key: 'orders', label: 'Tình trạng đơn hàng' },
          ];

  // Reports data fetching
  const { data: revenueData, loading: revLoading, error: revError } = useAsync(
    () => (tab === 'revenue' ? reportService.revenue({ ...range, groupBy: 'day' }) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: topProducts, loading: prodLoading, error: prodError } = useAsync(
    () => (tab === 'top-products' ? reportService.topProducts({ ...range, limit: 10 }) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: ordersReport, loading: ordLoading, error: ordError } = useAsync(
    () => (tab === 'orders' ? reportService.orders(range) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: movementData, loading: movLoading, error: movError } = useAsync(
    () => (tab === 'inventory-movement' ? reportService.inventoryMovement(range) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: stockReport, loading: stkLoading, error: stkError } = useAsync(
    () => (tab === 'stock' ? reportService.stock({ threshold: 5, staleDays: 30 }) : Promise.resolve(null)),
    [tab],
  );

  const { data: topCustomers, loading: cusLoading, error: cusError } = useAsync(
    () => (tab === 'top-customers' ? reportService.topCustomers({ ...range, limit: 10 }) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: employeeSales, loading: empLoading, error: empError } = useAsync(
    () => (tab === 'employees' ? reportService.employees(range) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: returnRates, loading: retLoading, error: retError } = useAsync(
    () => (tab === 'returns' ? reportService.returns(range) : Promise.resolve(null)),
    [tab, range],
  );

  async function handleExportExcel() {
    setExporting(true);
    try {
      await reportService.exportExcel(tab, { from: range.from, to: range.to });
    } catch (err: any) {
      window.alert('Lỗi xuất tệp Excel: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Báo cáo & Thống kê kinh doanh"
        subtitle="Tổng hợp số liệu kinh doanh, doanh thu thuần, xuất kho và hiệu suất"
        actions={
          <button className="btn btn--primary" onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'Đang xuất tệp…' : '📥 Xuất báo cáo Excel'}
          </button>
        }
      />

      <div className="card">
        <div className="page-header" style={{ marginBottom: 16 }}>
          <Tabs<ReportKey> tabs={availableTabs} value={tab} onChange={setTab} />
          {tab !== 'stock' && <DateRangeFilter value={range} onChange={setRange} />}
        </div>

        {/* 1. DOANH THU */}
        {tab === 'revenue' && (
          <div>
            <LoadState loading={revLoading} error={revError} empty={!revLoading && (!revenueData || revenueData.length === 0)} />
            {revenueData && revenueData.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Doanh thu gộp"
                    value={formatVnd(revenueData.reduce((s: number, r: RevenuePoint) => s + r.grossRevenue, 0))}
                    icon="wallet"
                    hint="Tổng giá trị các đơn đã giao"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng hoàn tiền"
                    value={formatVnd(revenueData.reduce((s: number, r: RevenuePoint) => s + r.refunded, 0))}
                    icon="return"
                    hint="Hoàn trả qua yêu cầu đổi trả"
                    tone="red"
                  />
                  <StatCard
                    label="Doanh thu thuần (Thực thu)"
                    value={formatVnd(revenueData.reduce((s: number, r: RevenuePoint) => s + r.netRevenue, 0))}
                    icon="trend"
                    hint="Doanh thu gộp trừ tiền hoàn"
                    tone="green"
                  />
                </div>

                <div className="card" style={{ background: '#f8fafc', marginBottom: 20 }}>
                  <h4 style={{ margin: '0 0 16px' }}>Biểu đồ doanh thu thuần theo ngày</h4>
                  <BarChart
                    data={revenueData.map((r: RevenuePoint) => ({
                      label: r.period.slice(5),
                      value: r.netRevenue,
                    }))}
                    format={formatVndShort}
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th className="num">Số đơn giao</th>
                        <th className="num">Doanh thu gộp</th>
                        <th className="num">Tiền hoàn</th>
                        <th className="num font-bold">Doanh thu thuần</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.map((r: RevenuePoint) => (
                        <tr key={r.period}>
                          <td><strong>{r.period}</strong></td>
                          <td className="num">{formatNumber(r.orders)}</td>
                          <td className="num">{formatVnd(r.grossRevenue)}</td>
                          <td className="num" style={{ color: r.refunded > 0 ? '#dc2626' : undefined }}>
                            {formatVnd(r.refunded)}
                          </td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(r.netRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* 2. TOP PRODUCTS */}
        {tab === 'top-products' && (
          <div>
            <LoadState loading={prodLoading} error={prodError} empty={!prodLoading && (!topProducts || topProducts.length === 0)} />
            {topProducts && topProducts.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Hạng</th>
                      <th style={{ width: 64 }}>Ảnh</th>
                      <th>Sản phẩm</th>
                      <th className="num">Số lượng bán</th>
                      <th style={{ width: 180 }}>Tỷ trọng</th>
                      <th className="num font-bold">Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p: TopProduct, idx: number) => {
                      const maxSold = topProducts[0].quantity;
                      return (
                        <tr key={p.productId}>
                          <td><span className={`badge ${idx < 3 ? 'badge--ok' : 'badge--muted'}`}>#{idx + 1}</span></td>
                          <td><Thumb src={p.imageUrl} alt={p.productName} /></td>
                          <td><strong>{p.productName}</strong></td>
                          <td className="num font-bold">{formatNumber(p.quantity)} đôi</td>
                          <td><Meter value={p.quantity} max={maxSold} /></td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(p.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. ORDERS SUMMARY */}
        {tab === 'orders' && (
          <div>
            <LoadState loading={ordLoading} error={ordError} empty={!ordLoading && !ordersReport} />
            {ordersReport && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng số đơn trong kỳ"
                    value={formatNumber(ordersReport.byStatus.reduce((s: number, o: { count: number }) => s + o.count, 0))}
                    icon="cart"
                    tone="blue"
                  />
                  <StatCard
                    label="Đơn chờ xử lý quá hạn"
                    value={formatNumber(ordersReport.overduePending)}
                    icon="alert"
                    hint="Chờ xác nhận > 24 giờ"
                    tone="orange"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Trạng thái đơn hàng</th>
                        <th className="num">Số lượng đơn</th>
                        <th style={{ width: 220 }}>Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersReport.byStatus.map((s: { status: string; count: number }) => {
                        const total = ordersReport.byStatus.reduce((acc: number, curr: { count: number }) => acc + curr.count, 0);
                        return (
                          <tr key={s.status}>
                            <td><span className={`badge status status--${s.status.toLowerCase()}`}>{s.status}</span></td>
                            <td className="num font-bold">{formatNumber(s.count)} đơn</td>
                            <td><Meter value={s.count} max={total} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* 4. NHẬP - XUẤT - TỒN */}
        {tab === 'inventory-movement' && (
          <div>
            <LoadState loading={movLoading} error={movError} empty={!movLoading && (!movementData || movementData.length === 0)} />
            {movementData && movementData.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã SKU</th>
                      <th>Tên sản phẩm</th>
                      <th>Kích cỡ / Màu</th>
                      <th className="num">Tồn đầu kỳ</th>
                      <th className="num">Nhập trong kỳ</th>
                      <th className="num">Xuất bán</th>
                      <th className="num font-bold">Tồn cuối kỳ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementData.map((m: InventoryMovementRow) => (
                      <tr key={m.variantId}>
                        <td><code>{m.sku}</code></td>
                        <td><strong>{m.productName}</strong></td>
                        <td>Size {m.sizeLabel} · {m.colorName}</td>
                        <td className="num">{formatNumber(m.openingStock)}</td>
                        <td className="num" style={{ color: '#168a4f' }}>+{formatNumber(m.imported)}</td>
                        <td className="num" style={{ color: '#dc2626' }}>-{formatNumber(m.exported)}</td>
                        <td className="num font-bold">{formatNumber(m.closingStock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. CẢNH BÁO TỒN KHO */}
        {tab === 'stock' && (
          <div>
            <LoadState loading={stkLoading} error={stkError} empty={!stkLoading && !stockReport} />
            {stockReport && (
              <div className="grid-2">
                <div>
                  <h4 style={{ margin: '0 0 12px', color: '#b45309' }}>⚠️ Sản phẩm sắp hết hàng (Tồn ≤ 5)</h4>
                  {stockReport.lowStock.length === 0 ? (
                    <p className="muted">Không có sản phẩm nào sắp hết hàng</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Sản phẩm</th>
                            <th className="num">Tồn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockReport.lowStock.map((s) => (
                            <tr key={s.variantId}>
                              <td><code>{s.sku}</code></td>
                              <td>{s.productName} ({s.sizeLabel} - {s.colorName})</td>
                              <td className="num font-bold"><span className="badge badge--danger">{s.stockQuantity}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ margin: '0 0 12px', color: '#64748b' }}>⏳ Sản phẩm tồn đọng lâu ngày (&gt; 30 ngày)</h4>
                  {stockReport.staleStock.length === 0 ? (
                    <p className="muted">Không có sản phẩm tồn lâu</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Sản phẩm</th>
                            <th className="num">Tồn</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockReport.staleStock.map((s) => (
                            <tr key={s.variantId}>
                              <td><code>{s.sku}</code></td>
                              <td>{s.productName} ({s.sizeLabel} - {s.colorName})</td>
                              <td className="num font-bold"><span className="badge badge--warning">{s.stockQuantity}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. TOP CUSTOMERS */}
        {tab === 'top-customers' && (
          <div>
            <LoadState loading={cusLoading} error={cusError} empty={!cusLoading && (!topCustomers || topCustomers.length === 0)} />
            {topCustomers && topCustomers.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Hạng</th>
                      <th>Khách hàng</th>
                      <th>Số điện thoại</th>
                      <th className="num">Đơn đã giao</th>
                      <th className="num font-bold">Tổng tiền đã mua</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c: TopCustomer, idx: number) => (
                      <tr key={c.customerId}>
                        <td><span className={`badge ${idx < 3 ? 'badge--ok' : 'badge--muted'}`}>#{idx + 1}</span></td>
                        <td><strong>{c.fullName}</strong></td>
                        <td>{c.phone || '—'}</td>
                        <td className="num">{formatNumber(c.orders)} đơn</td>
                        <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(c.totalPurchased)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 7. DOANH SỐ NHÂN VIÊN */}
        {tab === 'employees' && (
          <div>
            <LoadState loading={empLoading} error={empError} empty={!empLoading && (!employeeSales || employeeSales.length === 0)} />
            {employeeSales && employeeSales.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Mã NV</th>
                      <th>Họ và tên</th>
                      <th className="num">Số đơn lập</th>
                      <th style={{ width: 180 }}>Tỷ trọng</th>
                      <th className="num font-bold">Doanh số đem về</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSales.map((e: EmployeeSales) => {
                      const maxRev = employeeSales[0]?.revenue || 1;
                      return (
                        <tr key={e.employeeId}>
                          <td>#{e.employeeId}</td>
                          <td><strong>{e.fullName}</strong></td>
                          <td className="num">{formatNumber(e.orders)} đơn</td>
                          <td><Meter value={e.revenue} max={maxRev} /></td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(e.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 8. TỶ LỆ TRẢ HÀNG */}
        {tab === 'returns' && (
          <div>
            <LoadState loading={retLoading} error={retError} empty={!retLoading && (!returnRates || returnRates.length === 0)} />
            {returnRates && returnRates.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th className="num">SL đã bán</th>
                      <th className="num">SL bị trả lại</th>
                      <th className="num font-bold">Giá trị hoàn trả</th>
                      <th className="num font-bold">Tỷ lệ trả hàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnRates.map((r: ReturnRate) => (
                      <tr key={r.productId}>
                        <td><strong>{r.productName}</strong></td>
                        <td className="num">{formatNumber(r.soldQuantity)} đôi</td>
                        <td className="num" style={{ color: '#dc2626' }}>{formatNumber(r.returnedQuantity)} đôi</td>
                        <td className="num">{formatVnd(r.returnedValue)}</td>
                        <td className="num font-bold">
                          <span className={`badge ${r.ratePercent > 10 ? 'badge--danger' : 'badge--ok'}`}>
                            {r.ratePercent.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
