import { useMemo, useState } from 'react';
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
import { formatNumber, formatVnd, formatVndShort, lastDays, thisMonth, ymd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { BarChart, LoadState, Meter, StatCard, Tabs, Thumb } from '../common/Widgets';

interface Props {
  role: EmployeeRole;
}

const PRESETS = [
  { label: 'Hôm nay', getRange: () => { const t = ymd(new Date()); return { from: t, to: t }; } },
  { label: '7 ngày qua', getRange: () => lastDays(7) },
  { label: '30 ngày qua', getRange: () => lastDays(30) },
  { label: 'Tháng này', getRange: () => thisMonth() },
  {
    label: 'Tháng trước',
    getRange: () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: ymd(first), to: ymd(last) };
    },
  },
];

export function ReportsManager({ role }: Props) {
  const initialRange = lastDays(30);
  const [activePreset, setActivePreset] = useState<string>('30 ngày qua');
  const [draft, setDraft] = useState({ from: initialRange.from, to: initialRange.to, q: '' });
  const [applied, setApplied] = useState({ from: initialRange.from, to: initialRange.to, q: '' });
  const [tab, setTab] = useState<ReportKey>(role === 'WAREHOUSE' ? 'inventory-movement' : 'revenue');
  const [exporting, setExporting] = useState(false);

  // Danh sách tab theo vai trò
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

  const range = useMemo(() => ({ from: applied.from, to: applied.to }), [applied.from, applied.to]);

  // Reports data fetching
  const { data: revenueData, loading: revLoading, error: revError } = useAsync(
    () => (tab === 'revenue' ? reportService.revenue({ ...range, groupBy: 'day' }) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: topProducts, loading: prodLoading, error: prodError } = useAsync(
    () => (tab === 'top-products' ? reportService.topProducts({ ...range, limit: 15 }) : Promise.resolve(null)),
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
    () => (tab === 'top-customers' ? reportService.topCustomers({ ...range, limit: 15 }) : Promise.resolve(null)),
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

  function handleSelectPreset(preset: typeof PRESETS[0]) {
    const r = preset.getRange();
    setActivePreset(preset.label);
    setDraft((d) => ({ ...d, from: r.from, to: r.to }));
    setApplied((a) => ({ ...a, from: r.from, to: r.to }));
  }

  function handleSearch() {
    if (draft.from && draft.to && draft.from > draft.to) {
      window.alert('"Từ ngày" phải trước hoặc bằng "Đến ngày"');
      return;
    }
    setApplied(draft);
  }

  const pending =
    draft.from !== applied.from || draft.to !== applied.to || draft.q.trim() !== applied.q.trim();

  const query = applied.q.trim().toLowerCase();

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

  // Filtered views for each tab
  const filteredRevenue = useMemo(() => {
    if (!revenueData) return [];
    if (!query) return revenueData;
    return revenueData.filter((r) => r.period.toLowerCase().includes(query));
  }, [revenueData, query]);

  const filteredProducts = useMemo(() => {
    if (!topProducts) return [];
    if (!query) return topProducts;
    return topProducts.filter(
      (p) => p.productName.toLowerCase().includes(query) || String(p.productId) === query,
    );
  }, [topProducts, query]);

  const filteredMovement = useMemo(() => {
    if (!movementData) return [];
    if (!query) return movementData;
    return movementData.filter(
      (m) =>
        m.sku.toLowerCase().includes(query) ||
        m.productName.toLowerCase().includes(query) ||
        m.sizeLabel.toLowerCase().includes(query) ||
        m.colorName.toLowerCase().includes(query),
    );
  }, [movementData, query]);

  const filteredStockLow = useMemo(() => {
    if (!stockReport?.lowStock) return [];
    if (!query) return stockReport.lowStock;
    return stockReport.lowStock.filter(
      (s) =>
        s.sku.toLowerCase().includes(query) ||
        s.productName.toLowerCase().includes(query) ||
        s.sizeLabel.toLowerCase().includes(query) ||
        s.colorName.toLowerCase().includes(query),
    );
  }, [stockReport, query]);

  const filteredStockStale = useMemo(() => {
    if (!stockReport?.staleStock) return [];
    if (!query) return stockReport.staleStock;
    return stockReport.staleStock.filter(
      (s) =>
        s.sku.toLowerCase().includes(query) ||
        s.productName.toLowerCase().includes(query) ||
        s.sizeLabel.toLowerCase().includes(query) ||
        s.colorName.toLowerCase().includes(query),
    );
  }, [stockReport, query]);

  const filteredCustomers = useMemo(() => {
    if (!topCustomers) return [];
    if (!query) return topCustomers;
    return topCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        String(c.customerId) === query,
    );
  }, [topCustomers, query]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSales) return [];
    if (!query) return employeeSales;
    return employeeSales.filter(
      (e) => e.fullName.toLowerCase().includes(query) || String(e.employeeId) === query,
    );
  }, [employeeSales, query]);

  const filteredReturns = useMemo(() => {
    if (!returnRates) return [];
    if (!query) return returnRates;
    return returnRates.filter(
      (r) => r.productName.toLowerCase().includes(query) || String(r.productId) === query,
    );
  }, [returnRates, query]);

  return (
    <>
      <PageHeader
        title="Báo cáo & Thống kê kinh doanh"
        subtitle="Tổng hợp chỉ số doanh thu thuần, xuất kho, hàng tồn và hiệu suất vận hành hệ thống"
        actions={
          <button className="btn btn--primary" onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'Đang xuất tệp…' : '📥 Xuất báo cáo Excel'}
          </button>
        }
      />

      <div className="card">
        <Tabs<ReportKey> tabs={availableTabs} value={tab} onChange={setTab} />

        {/* BỘ LỌC THỜI GIAN & TÌM KIẾM BÁO CÁO */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          {tab !== 'stock' ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Khoảng thời gian:</span>
                {PRESETS.map((p) => {
                  const isCurrent = activePreset === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      className={`btn ${isCurrent ? 'btn--primary' : 'btn--ghost'}`}
                      style={{ padding: '4px 12px', fontSize: 12.5, borderRadius: 999 }}
                      onClick={() => handleSelectPreset(p)}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <SearchBar
                onSearch={handleSearch}
                hint={pending ? 'Bạn đã đổi thời gian hoặc từ khóa, bấm "Tìm kiếm" để cập nhật số liệu báo cáo.' : undefined}
              >
                <label className="date-filter">
                  Từ <input
                    type="date"
                    value={draft.from}
                    onChange={(e) => {
                      setActivePreset('');
                      setDraft((d) => ({ ...d, from: e.target.value }));
                    }}
                  />
                </label>
                <label className="date-filter">
                  Đến <input
                    type="date"
                    value={draft.to}
                    onChange={(e) => {
                      setActivePreset('');
                      setDraft((d) => ({ ...d, to: e.target.value }));
                    }}
                  />
                </label>
                <input
                  className="search"
                  placeholder="Lọc nhanh kết quả (sản phẩm, SKU, khách hàng, nhân viên, ngày)..."
                  value={draft.q}
                  onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                />
              </SearchBar>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge--ok">Snapshot tức thời</span>
                <span style={{ fontSize: 13, color: '#64748b' }}>Số liệu tồn kho thực tế phản ánh dữ liệu trực tiếp trong hệ thống</span>
              </div>
              <div style={{ minWidth: 260 }}>
                <SearchBar onSearch={handleSearch}>
                  <input
                    className="search"
                    placeholder="Tìm theo SKU, tên giày..."
                    value={draft.q}
                    onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                  />
                </SearchBar>
              </div>
            </div>
          )}
        </div>

        {/* 1. DOANH THU */}
        {tab === 'revenue' && (
          <div>
            <LoadState loading={revLoading} error={revError} empty={!revLoading && (!revenueData || revenueData.length === 0)} />
            {revenueData && revenueData.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Doanh thu thuần (Thực thu)"
                    value={formatVnd(revenueData.reduce((s: number, r: RevenuePoint) => s + r.netRevenue, 0))}
                    icon="trend"
                    hint="Doanh thu gộp trừ tiền hoàn trả"
                    tone="green"
                  />
                  <StatCard
                    label="Doanh thu gộp"
                    value={formatVnd(revenueData.reduce((s: number, r: RevenuePoint) => s + r.grossRevenue, 0))}
                    icon="wallet"
                    hint="Tổng giá trị các đơn đã giao"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng tiền hoàn trả"
                    value={formatVnd(revenueData.reduce((s: number, r: RevenuePoint) => s + r.refunded, 0))}
                    icon="return"
                    hint="Hoàn trả qua yêu cầu đổi trả"
                    tone="red"
                  />
                  <StatCard
                    label="Tổng số đơn giao"
                    value={`${formatNumber(revenueData.reduce((s: number, r: RevenuePoint) => s + r.orders, 0))} đơn`}
                    icon="cart"
                    hint="Đơn hàng hoàn tất trong kỳ"
                    tone="violet"
                  />
                </div>

                <div className="card" style={{ background: '#f8fafc', marginBottom: 20 }}>
                  <div className="page-header" style={{ marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Biểu đồ doanh thu thuần theo ngày</h4>
                      <p className="muted small" style={{ margin: '4px 0 0' }}>Biến động doanh thu thực nhận trong khoảng thời gian đã chọn</p>
                    </div>
                  </div>
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
                      {filteredRevenue.map((r: RevenuePoint) => (
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
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                        <td>TỔNG CỘNG</td>
                        <td className="num">{formatNumber(filteredRevenue.reduce((s, r) => s + r.orders, 0))} đơn</td>
                        <td className="num">{formatVnd(filteredRevenue.reduce((s, r) => s + r.grossRevenue, 0))}</td>
                        <td className="num" style={{ color: '#dc2626' }}>
                          {formatVnd(filteredRevenue.reduce((s, r) => s + r.refunded, 0))}
                        </td>
                        <td className="num font-bold" style={{ color: '#059669' }}>
                          {formatVnd(filteredRevenue.reduce((s, r) => s + r.netRevenue, 0))}
                        </td>
                      </tr>
                    </tfoot>
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
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng số lượng bán (Top)"
                    value={`${formatNumber(topProducts.reduce((s, p) => s + p.quantity, 0))} đôi`}
                    icon="box"
                    hint="Tổng số đôi giày tiêu thụ"
                    tone="blue"
                  />
                  <StatCard
                    label="Doanh thu mang về (Top)"
                    value={formatVnd(topProducts.reduce((s, p) => s + p.revenue, 0))}
                    icon="wallet"
                    hint="Đóng góp doanh thu từ sản phẩm bán chạy"
                    tone="green"
                  />
                  <StatCard
                    label="Sản phẩm bán chạy nhất (#1)"
                    value={topProducts[0]?.productName || '—'}
                    icon="trend"
                    hint={`Đã bán ${formatNumber(topProducts[0]?.quantity || 0)} đôi`}
                    tone="orange"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 64 }}>Thứ hạng</th>
                        <th style={{ width: 64 }}>Ảnh</th>
                        <th>Sản phẩm</th>
                        <th className="num">Số lượng bán</th>
                        <th style={{ width: 180 }}>Tỷ trọng</th>
                        <th className="num font-bold">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p: TopProduct, idx: number) => {
                        const maxSold = topProducts[0]?.quantity || 1;
                        const rankClass =
                          idx === 0
                            ? 'badge badge--ok'
                            : idx === 1
                            ? 'badge badge--warning'
                            : idx === 2
                            ? 'badge badge--muted'
                            : 'badge badge--muted';

                        return (
                          <tr key={p.productId}>
                            <td><span className={rankClass} style={{ fontWeight: 800 }}>#{idx + 1}</span></td>
                            <td><Thumb src={p.imageUrl} alt={p.productName} /></td>
                            <td>
                              <strong>{p.productName}</strong>
                              <div className="muted small">Mã SP: #{p.productId}</div>
                            </td>
                            <td className="num font-bold">{formatNumber(p.quantity)} đôi</td>
                            <td><Meter value={p.quantity} max={maxSold} /></td>
                            <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(p.revenue)}</td>
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

        {/* 3. ORDERS SUMMARY */}
        {tab === 'orders' && (
          <div>
            <LoadState loading={ordLoading} error={ordError} empty={!ordLoading && !ordersReport} />
            {ordersReport && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng số đơn trong kỳ"
                    value={`${formatNumber(ordersReport.byStatus.reduce((s: number, o: { count: number }) => s + o.count, 0))} đơn`}
                    icon="cart"
                    tone="blue"
                  />
                  <StatCard
                    label="Đơn đã giao thành công"
                    value={`${formatNumber(ordersReport.byStatus.find((s) => s.status === 'DELIVERED')?.count || 0)} đơn`}
                    icon="trend"
                    hint="Tỷ lệ giao hoàn tất"
                    tone="green"
                  />
                  <StatCard
                    label="Đơn chờ xử lý quá hạn"
                    value={`${formatNumber(ordersReport.overduePending)} đơn`}
                    icon="alert"
                    hint="Chờ xác nhận > 24 giờ"
                    tone="orange"
                  />
                  <StatCard
                    label="Đơn bị hủy"
                    value={`${formatNumber(ordersReport.byStatus.find((s) => s.status === 'CANCELLED')?.count || 0)} đơn`}
                    icon="return"
                    hint="Khách hủy hoặc hết hàng"
                    tone="red"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Trạng thái đơn hàng</th>
                        <th className="num">Số lượng đơn</th>
                        <th style={{ width: 220 }}>Tỷ trọng trạng thái</th>
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
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng tồn đầu kỳ"
                    value={`${formatNumber(movementData.reduce((s, m) => s + m.openingStock, 0))} đôi`}
                    icon="box"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng nhập trong kỳ"
                    value={`+${formatNumber(movementData.reduce((s, m) => s + m.imported, 0))} đôi`}
                    icon="cart"
                    tone="green"
                  />
                  <StatCard
                    label="Tổng xuất bán"
                    value={`-${formatNumber(movementData.reduce((s, m) => s + m.exported, 0))} đôi`}
                    icon="wallet"
                    tone="orange"
                  />
                  <StatCard
                    label="Tổng tồn cuối kỳ"
                    value={`${formatNumber(movementData.reduce((s, m) => s + m.closingStock, 0))} đôi`}
                    icon="box"
                    tone="violet"
                  />
                </div>

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
                      {filteredMovement.map((m: InventoryMovementRow) => (
                        <tr key={m.variantId}>
                          <td><code>{m.sku}</code></td>
                          <td><strong>{m.productName}</strong></td>
                          <td>Size {m.sizeLabel} · {m.colorName}</td>
                          <td className="num">{formatNumber(m.openingStock)}</td>
                          <td className="num" style={{ color: '#168a4f', fontWeight: 600 }}>+{formatNumber(m.imported)}</td>
                          <td className="num" style={{ color: '#dc2626', fontWeight: 600 }}>-{formatNumber(m.exported)}</td>
                          <td className="num font-bold">{formatNumber(m.closingStock)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* 5. CẢNH BÁO TỒN KHO */}
        {tab === 'stock' && (
          <div>
            <LoadState loading={stkLoading} error={stkError} empty={!stkLoading && !stockReport} />
            {stockReport && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Mẫu sắp hết hàng"
                    value={`${stockReport.lowStock.length} mẫu`}
                    icon="alert"
                    hint="Biến thể tồn ≤ 5 đôi"
                    tone={stockReport.lowStock.length > 0 ? 'orange' : 'green'}
                  />
                  <StatCard
                    label="Mẫu tồn đọng lâu"
                    value={`${stockReport.staleStock.length} mẫu`}
                    icon="box"
                    hint="Chưa có giao dịch > 30 ngày"
                    tone={stockReport.staleStock.length > 0 ? 'red' : 'green'}
                  />
                </div>

                <div className="grid-2">
                  <div className="card" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#b45309' }}>⚠️ Sản phẩm sắp hết hàng (Tồn ≤ 5 đôi)</h4>
                    {filteredStockLow.length === 0 ? (
                      <p className="muted">Không có sản phẩm nào sắp hết hàng</p>
                    ) : (
                      <div className="table-wrap">
                        <table className="table" style={{ background: '#fff' }}>
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Sản phẩm</th>
                              <th className="num">Tồn</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStockLow.map((s) => (
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

                  <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 12px', color: '#475569' }}>⏳ Sản phẩm tồn đọng lâu ngày (&gt; 30 ngày)</h4>
                    {filteredStockStale.length === 0 ? (
                      <p className="muted">Không có sản phẩm tồn lâu</p>
                    ) : (
                      <div className="table-wrap">
                        <table className="table" style={{ background: '#fff' }}>
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Sản phẩm</th>
                              <th className="num">Tồn</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredStockStale.map((s) => (
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
              </>
            )}
          </div>
        )}

        {/* 6. TOP CUSTOMERS */}
        {tab === 'top-customers' && (
          <div>
            <LoadState loading={cusLoading} error={cusError} empty={!cusLoading && (!topCustomers || topCustomers.length === 0)} />
            {topCustomers && topCustomers.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Khách hàng thân thiết (Top)"
                    value={`${topCustomers.length} khách`}
                    icon="dashboard"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng doanh thu từ nhóm Top"
                    value={formatVnd(topCustomers.reduce((s, c) => s + c.totalPurchased, 0))}
                    icon="wallet"
                    tone="green"
                  />
                  <StatCard
                    label="Khách hàng chi tiêu cao nhất (#1)"
                    value={topCustomers[0]?.fullName || '—'}
                    icon="trend"
                    hint={formatVnd(topCustomers[0]?.totalPurchased || 0)}
                    tone="orange"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 64 }}>Thứ hạng</th>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        <th className="num">Đơn đã giao</th>
                        <th className="num font-bold">Tổng tiền đã mua</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c: TopCustomer, idx: number) => (
                        <tr key={c.customerId}>
                          <td><span className={`badge ${idx < 3 ? 'badge--ok' : 'badge--muted'}`} style={{ fontWeight: 800 }}>#{idx + 1}</span></td>
                          <td><strong>{c.fullName}</strong></td>
                          <td>{c.phone || '—'}</td>
                          <td className="num font-bold">{formatNumber(c.orders)} đơn</td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(c.totalPurchased)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* 7. DOANH SỐ NHÂN VIÊN */}
        {tab === 'employees' && (
          <div>
            <LoadState loading={empLoading} error={empError} empty={!empLoading && (!employeeSales || employeeSales.length === 0)} />
            {employeeSales && employeeSales.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng nhân viên ghi nhận"
                    value={`${employeeSales.length} nhân sự`}
                    icon="dashboard"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng doanh số đem về"
                    value={formatVnd(employeeSales.reduce((s, e) => s + e.revenue, 0))}
                    icon="wallet"
                    tone="green"
                  />
                  <StatCard
                    label="Nhân viên xuất sắc nhất (#1)"
                    value={employeeSales[0]?.fullName || '—'}
                    icon="trend"
                    hint={formatVnd(employeeSales[0]?.revenue || 0)}
                    tone="orange"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 80 }}>Mã NV</th>
                        <th>Họ và tên</th>
                        <th className="num">Số đơn lập</th>
                        <th style={{ width: 180 }}>Tỷ trọng doanh số</th>
                        <th className="num font-bold">Doanh số đem về</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((e: EmployeeSales) => {
                        const maxRev = employeeSales[0]?.revenue || 1;
                        return (
                          <tr key={e.employeeId}>
                            <td>#{e.employeeId}</td>
                            <td><strong>{e.fullName}</strong></td>
                            <td className="num font-bold">{formatNumber(e.orders)} đơn</td>
                            <td><Meter value={e.revenue} max={maxRev} /></td>
                            <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(e.revenue)}</td>
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

        {/* 8. TỶ LỆ TRẢ HÀNG */}
        {tab === 'returns' && (
          <div>
            <LoadState loading={retLoading} error={retError} empty={!retLoading && (!returnRates || returnRates.length === 0)} />
            {returnRates && returnRates.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Sản phẩm phát sinh hoàn trả"
                    value={`${returnRates.length} mẫu`}
                    icon="alert"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng số lượng bị trả"
                    value={`${formatNumber(returnRates.reduce((s, r) => s + r.returnedQuantity, 0))} đôi`}
                    icon="box"
                    tone="orange"
                  />
                  <StatCard
                    label="Tổng giá trị hoàn trả"
                    value={formatVnd(returnRates.reduce((s, r) => s + r.returnedValue, 0))}
                    icon="return"
                    tone="red"
                  />
                </div>

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
                      {filteredReturns.map((r: ReturnRate) => (
                        <tr key={r.productId}>
                          <td><strong>{r.productName}</strong></td>
                          <td className="num">{formatNumber(r.soldQuantity)} đôi</td>
                          <td className="num" style={{ color: '#dc2626', fontWeight: 600 }}>{formatNumber(r.returnedQuantity)} đôi</td>
                          <td className="num font-bold">{formatVnd(r.returnedValue)}</td>
                          <td className="num font-bold">
                            <span className={`badge ${r.ratePercent > 10 ? 'badge--danger' : r.ratePercent > 5 ? 'badge--warning' : 'badge--ok'}`}>
                              {r.ratePercent.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
