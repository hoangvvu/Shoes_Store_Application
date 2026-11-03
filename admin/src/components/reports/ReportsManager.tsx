import { useEffect, useMemo, useState } from 'react';
import { reportService } from '../../services/report.service';
import type { EmployeeRole } from '../../types/auth';
import type {
  CustomerMatrixRow,
  EmployeeMatrixRow,
  EmployeeSales,
  InventoryMovementRow,
  LocationReport,
  ProductMatrixRow,
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
import { Pagination } from '../tables/Pagination';

/** Hook quản lý phân trang độc lập cho từng bảng báo cáo */
function useClientPagination<T>(items: T[], defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [items]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const paginationControl = total > pageSize ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="muted small">Hiển thị:</span>
        <select
          className="select small"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{ width: 'auto', padding: '3px 8px', fontSize: 13 }}
        >
          <option value="5">5 / trang</option>
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>
        <span className="muted small">
          ({(safePage - 1) * pageSize + 1} – {Math.min(safePage * pageSize, total)} trên tổng {total})
        </span>
      </div>
      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={total}
        onChange={setPage}
      />
    </div>
  ) : total > 5 ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
      <span className="muted small">Hiển thị toàn bộ {total} bản ghi</span>
      <select
        className="select small"
        value={pageSize}
        onChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(1);
        }}
        style={{ width: 'auto', padding: '2px 8px', fontSize: 12 }}
      >
        <option value="5">5 / trang</option>
        <option value="10">10 / trang</option>
        <option value="20">20 / trang</option>
      </select>
    </div>
  ) : null;

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    paginatedItems,
    totalPages,
    total,
    paginationControl,
  };
}

interface Props {
  role: EmployeeRole;
}

const PRESETS = [
  { label: 'Hôm nay', getRange: () => { const t = ymd(new Date()); return { from: t, to: t }; } },
  { label: '7 ngày qua', getRange: () => lastDays(7) },
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
  const initialRange = thisMonth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [activePreset, setActivePreset] = useState<string>('Tháng này');
  const [draft, setDraft] = useState({ from: initialRange.from, to: initialRange.to, q: '' });
  const [applied, setApplied] = useState({ from: initialRange.from, to: initialRange.to, q: '' });
  const [tab, setTab] = useState<ReportKey>(
    role === 'WAREHOUSE' ? 'inventory-movement' : role === 'SALES' ? 'top-products' : 'financial-matrix',
  );
  const [exporting, setExporting] = useState(false);

  const availableTabs: { key: ReportKey; label: string }[] =
    role === 'ADMIN'
      ? [
        { key: 'financial-matrix', label: 'Báo cáo Thu – Chi – Lợi nhuận' },
        { key: 'locations', label: 'Thống kê theo địa điểm' },
        { key: 'employee-matrix', label: 'Doanh số NV theo Quý' },
        { key: 'customer-matrix', label: 'Doanh số KH theo Năm' },
        { key: 'product-matrix', label: 'Doanh số SP theo Quý' },
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

  const isMatrixTab = ['financial-matrix', 'employee-matrix', 'customer-matrix', 'product-matrix'].includes(tab);
  const range = useMemo(() => ({ from: applied.from, to: applied.to }), [applied.from, applied.to]);

  // Data fetching
  const { data: finMatrixData, loading: finLoading, error: finError } = useAsync(
    () => (tab === 'financial-matrix' ? reportService.financialMatrix(selectedYear) : Promise.resolve(null)),
    [tab, selectedYear],
  );

  const { data: locationData, loading: locLoading, error: locError } = useAsync(
    () => (tab === 'locations' ? reportService.locations({ ...range, limit: 100 }) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: empMatrixData, loading: empMatLoading, error: empMatError } = useAsync(
    () => (tab === 'employee-matrix' ? reportService.employeeMatrix(selectedYear) : Promise.resolve(null)),
    [tab, selectedYear],
  );

  const { data: cusMatrixData, loading: cusMatLoading, error: cusMatError } = useAsync(
    () => (tab === 'customer-matrix' ? reportService.customerMatrix(selectedYear) : Promise.resolve(null)),
    [tab, selectedYear],
  );

  const { data: prodMatrixData, loading: prodMatLoading, error: prodMatError } = useAsync(
    () => (tab === 'product-matrix' ? reportService.productMatrix(selectedYear) : Promise.resolve(null)),
    [tab, selectedYear],
  );

  const { data: revenueData, loading: revLoading, error: revError } = useAsync(
    () => (tab === 'revenue' ? reportService.revenue({ ...range, groupBy: 'day' }) : Promise.resolve(null)),
    [tab, range],
  );

  const { data: topProducts, loading: prodLoading, error: prodError } = useAsync(
    () => (tab === 'top-products' ? reportService.topProducts({ ...range, limit: 100 }) : Promise.resolve(null)),
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
    () => (tab === 'top-customers' ? reportService.topCustomers({ ...range, limit: 100 }) : Promise.resolve(null)),
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

  const query = applied.q.trim().toLowerCase();

  async function handleExportExcel() {
    setExporting(true);
    try {
      await reportService.exportExcel(tab, { from: range.from, to: range.to, year: selectedYear });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Vui lòng thử lại';
      window.alert('Lỗi xuất tệp Excel: ' + msg);
    } finally {
      setExporting(false);
    }
  }

  // Filtered views
  const filteredLocations = useMemo(() => {
    if (!locationData) return [];
    if (!query) return locationData;
    return locationData.filter((l) => l.province.toLowerCase().includes(query));
  }, [locationData, query]);

  const filteredEmpMatrix = useMemo(() => {
    if (!empMatrixData) return [];
    if (!query) return empMatrixData;
    return empMatrixData.filter((e) => e.fullName.toLowerCase().includes(query) || String(e.employeeId) === query);
  }, [empMatrixData, query]);

  const filteredCusMatrix = useMemo(() => {
    if (!cusMatrixData?.rows) return [];
    if (!query) return cusMatrixData.rows;
    return cusMatrixData.rows.filter(
      (c) => c.fullName.toLowerCase().includes(query) || (c.phone && c.phone.includes(query)),
    );
  }, [cusMatrixData, query]);

  const filteredProdMatrix = useMemo(() => {
    if (!prodMatrixData) return [];
    if (!query) return prodMatrixData;
    return prodMatrixData.filter((p) => p.productName.toLowerCase().includes(query) || String(p.productId) === query);
  }, [prodMatrixData, query]);

  const filteredRevenue = useMemo(() => {
    if (!revenueData) return [];
    if (!query) return revenueData;
    return revenueData.filter((r) => r.period.toLowerCase().includes(query));
  }, [revenueData, query]);

  const filteredProducts = useMemo(() => {
    if (!topProducts) return [];
    if (!query) return topProducts;
    return topProducts.filter((p) => p.productName.toLowerCase().includes(query) || String(p.productId) === query);
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
      (s) => s.sku.toLowerCase().includes(query) || s.productName.toLowerCase().includes(query),
    );
  }, [stockReport, query]);

  const filteredStockStale = useMemo(() => {
    if (!stockReport?.staleStock) return [];
    if (!query) return stockReport.staleStock;
    return stockReport.staleStock.filter(
      (s) => s.sku.toLowerCase().includes(query) || s.productName.toLowerCase().includes(query),
    );
  }, [stockReport, query]);

  const filteredCustomers = useMemo(() => {
    if (!topCustomers) return [];
    if (!query) return topCustomers;
    return topCustomers.filter(
      (c) => c.fullName.toLowerCase().includes(query) || (c.phone && c.phone.includes(query)),
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
    return returnRates.filter((r) => r.productName.toLowerCase().includes(query));
  }, [returnRates, query]);

  // Pagination controls
  const pgLocations = useClientPagination(filteredLocations);
  const pgEmpMatrix = useClientPagination(filteredEmpMatrix);
  const pgCusMatrix = useClientPagination(filteredCusMatrix);
  const pgProdMatrix = useClientPagination(filteredProdMatrix);
  const pgRevenue = useClientPagination(filteredRevenue);
  const pgProducts = useClientPagination(filteredProducts);
  const pgMovement = useClientPagination(filteredMovement);
  const pgStockLow = useClientPagination(filteredStockLow);
  const pgStockStale = useClientPagination(filteredStockStale);
  const pgCustomers = useClientPagination(filteredCustomers);
  const pgEmployees = useClientPagination(filteredEmployees);
  const pgReturns = useClientPagination(filteredReturns);

  return (
    <>
      <div className="print-only" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>SHOESTORE - BÁO CÁO THỐNG KÊ DOANH THU & QUẢN TRỊ</h2>
        <p style={{ margin: '4px 0', fontSize: 13, color: '#444' }}>
          Thời gian in: {new Date().toLocaleString('vi-VN')} | Báo cáo: {availableTabs.find((t) => t.key === tab)?.label}
        </p>
      </div>

      <PageHeader
        title="Báo cáo thống kê"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => window.print()}
              title="In hoặc xuất PDF báo cáo"
            >
              🖨 In / Xuất PDF
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? 'Đang xuất…' : '📥 Xuất Excel'}
            </button>
          </div>
        }
      />

      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <Tabs tabs={availableTabs} value={tab} onChange={(k) => setTab(k as ReportKey)} />
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {isMatrixTab ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600 }}>Năm báo cáo:</span>
                <select
                  className="select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ width: 'auto', minWidth: 120 }}
                >
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 280 }}>
                <SearchBar onSearch={handleSearch}>
                  <input
                    className="search"
                    placeholder="Lọc nhanh kết quả..."
                    value={draft.q}
                    onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
                  />
                </SearchBar>
              </div>
            </div>
          ) : tab !== 'stock' ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`btn btn--sm ${activePreset === p.label ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => handleSelectPreset(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <SearchBar onSearch={handleSearch}>
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
                  placeholder="Lọc nhanh kết quả (sản phẩm, khách hàng, nhân viên, tỉnh/thành)..."
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

        {/* 1. MA TRẬN THU - CHI - LỢI NHUẬN */}
        {tab === 'financial-matrix' && (
          <div>
            <LoadState loading={finLoading} error={finError} empty={!finLoading && (!finMatrixData || finMatrixData.rows.length === 0)} />
            {finMatrixData && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label={`Lợi nhuận năm ${selectedYear}`}
                    value={formatVnd(finMatrixData.rows.find((r) => r.label === 'Lợi nhuận')?.total ?? 0)}
                    icon="trend"
                    tone="green"
                    hint="Tổng thu trừ tổng chi trong cả năm"
                  />
                  <StatCard
                    label={`Tổng thu năm ${selectedYear}`}
                    value={formatVnd(finMatrixData.rows.find((r) => r.label === 'Tổng thu')?.total ?? 0)}
                    icon="wallet"
                    tone="blue"
                    hint="Doanh thu hóa đơn giao thành công"
                  />
                  <StatCard
                    label={`Tổng chi năm ${selectedYear}`}
                    value={formatVnd(finMatrixData.rows.find((r) => r.label === 'Tổng chi')?.total ?? 0)}
                    icon="cart"
                    tone="orange"
                    hint="Tổng tiền nhập hàng phiếu nhập kho"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: 160 }}>Năm {selectedYear}</th>
                        <th className="num">Quý 1 (Q1)</th>
                        <th className="num">Quý 2 (Q2)</th>
                        <th className="num">Quý 3 (Q3)</th>
                        <th className="num">Quý 4 (Q4)</th>
                        <th className="num font-bold">Tổng cộng cả năm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finMatrixData.rows.map((row) => (
                        <tr key={row.label} style={row.label === 'Lợi nhuận' ? { backgroundColor: '#f0fdf4', fontWeight: 'bold' } : undefined}>
                          <td><strong>{row.label}</strong></td>
                          <td className="num">{formatVnd(row.q1)}</td>
                          <td className="num">{formatVnd(row.q2)}</td>
                          <td className="num">{formatVnd(row.q3)}</td>
                          <td className="num">{formatVnd(row.q4)}</td>
                          <td className="num font-bold" style={{ color: row.label === 'Tổng chi' ? '#d97706' : row.label === 'Lợi nhuận' ? '#059669' : '#2563eb' }}>
                            {formatVnd(row.total)}
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

        {/* 2. THỐNG KÊ THEO ĐỊA ĐIỂM */}
        {tab === 'locations' && (
          <div>
            <LoadState loading={locLoading} error={locError} empty={!locLoading && (!locationData || locationData.length === 0)} />
            {locationData && locationData.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Địa điểm mua nhiều nhất"
                    value={locationData[0]?.province ?? '—'}
                    icon="wallet"
                    tone="blue"
                    hint={`Đóng góp ${locationData[0]?.percentage}% tổng doanh thu`}
                  />
                  <StatCard
                    label="Tổng số đơn giao"
                    value={`${formatNumber(locationData.reduce((s, x) => s + x.orders, 0))} đơn`}
                    icon="cart"
                    tone="green"
                  />
                  <StatCard
                    label="Tổng doanh thu các tỉnh"
                    value={formatVnd(locationData.reduce((s, x) => s + x.revenue, 0))}
                    icon="trend"
                    tone="violet"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tỉnh / Thành phố</th>
                        <th className="num">Số đơn hàng</th>
                        <th>Tỷ trọng doanh thu</th>
                        <th className="num font-bold">Doanh thu</th>
                        <th className="num">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgLocations.paginatedItems.map((l: LocationReport) => (
                        <tr key={l.province}>
                          <td><strong>{l.province}</strong></td>
                          <td className="num">{formatNumber(l.orders)} đơn</td>
                          <td><Meter value={l.revenue} max={locationData[0]?.revenue || 1} /></td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(l.revenue)}</td>
                          <td className="num">
                            <span className="badge badge--ok">{l.percentage}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgLocations.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 3. DOANH SỐ NHÂN VIÊN THEO QUÝ */}
        {tab === 'employee-matrix' && (
          <div>
            <LoadState loading={empMatLoading} error={empMatError} empty={!empMatLoading && (!empMatrixData || empMatrixData.length === 0)} />
            {empMatrixData && empMatrixData.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng nhân viên ghi nhận"
                    value={`${empMatrixData.length} người`}
                    icon="wallet"
                    tone="blue"
                  />
                  <StatCard
                    label="Nhân viên xuất sắc nhất"
                    value={empMatrixData[0]?.fullName ?? '—'}
                    icon="trend"
                    tone="green"
                    hint={formatVnd(empMatrixData[0]?.total ?? 0)}
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mã NV</th>
                        <th>Họ và tên</th>
                        <th className="num">Quý 1 (Q1)</th>
                        <th className="num">Quý 2 (Q2)</th>
                        <th className="num">Quý 3 (Q3)</th>
                        <th className="num">Quý 4 (Q4)</th>
                        <th className="num font-bold">Tổng doanh số cả năm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgEmpMatrix.paginatedItems.map((e: EmployeeMatrixRow) => (
                        <tr key={e.employeeId}>
                          <td><code>#{e.employeeId}</code></td>
                          <td><strong>{e.fullName}</strong></td>
                          <td className="num">{formatVnd(e.q1)}</td>
                          <td className="num">{formatVnd(e.q2)}</td>
                          <td className="num">{formatVnd(e.q3)}</td>
                          <td className="num">{formatVnd(e.q4)}</td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(e.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgEmpMatrix.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 4. DOANH SỐ KHÁCH HÀNG THEO NĂM */}
        {tab === 'customer-matrix' && (
          <div>
            <LoadState loading={cusMatLoading} error={cusMatError} empty={!cusMatLoading && (!cusMatrixData || cusMatrixData.rows.length === 0)} />
            {cusMatrixData && cusMatrixData.rows.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mã KH</th>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        {cusMatrixData.years.map((y) => (
                          <th key={y} className="num">Năm {y}</th>
                        ))}
                        <th className="num font-bold">Tổng cộng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgCusMatrix.paginatedItems.map((c: CustomerMatrixRow) => (
                        <tr key={c.customerId}>
                          <td><code>#{c.customerId}</code></td>
                          <td><strong>{c.fullName}</strong></td>
                          <td>{c.phone || '—'}</td>
                          {cusMatrixData.years.map((y) => (
                            <td key={y} className="num">{formatVnd(c.years[String(y)] ?? 0)}</td>
                          ))}
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(c.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgCusMatrix.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 5. DOANH SỐ SẢN PHẨM THEO QUÝ */}
        {tab === 'product-matrix' && (
          <div>
            <LoadState loading={prodMatLoading} error={prodMatError} empty={!prodMatLoading && (!prodMatrixData || prodMatrixData.length === 0)} />
            {prodMatrixData && prodMatrixData.length > 0 && (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mã SP</th>
                        <th>Sản phẩm</th>
                        <th className="num">Quý 1 (Q1)</th>
                        <th className="num">Quý 2 (Q2)</th>
                        <th className="num">Quý 3 (Q3)</th>
                        <th className="num">Quý 4 (Q4)</th>
                        <th className="num font-bold">Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgProdMatrix.paginatedItems.map((p: ProductMatrixRow) => (
                        <tr key={p.productId}>
                          <td><code>#{p.productId}</code></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <Thumb src={p.imageUrl} alt={p.productName} />
                              <strong>{p.productName}</strong>
                            </div>
                          </td>
                          <td className="num">{formatVnd(p.q1)}</td>
                          <td className="num">{formatVnd(p.q2)}</td>
                          <td className="num">{formatVnd(p.q3)}</td>
                          <td className="num">{formatVnd(p.q4)}</td>
                          <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgProdMatrix.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 6. DOANH THU THUẦN */}
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
                    hint="Các khoản hoàn tiền đổi/trả"
                    tone="red"
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ margin: '0 0 12px' }}>Biểu đồ doanh thu thuần theo thời gian</h4>
                  <BarChart
                    data={revenueData.map((r: RevenuePoint) => ({
                      label: r.period.length === 10 ? r.period.slice(5) : r.period,
                      value: r.netRevenue,
                    }))}
                    format={(v: number) => formatVndShort(v)}
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Thời gian</th>
                        <th className="num">Số đơn đã giao</th>
                        <th className="num font-bold">Doanh thu gộp</th>
                        <th className="num">Hoàn tiền</th>
                        <th className="num font-bold">Doanh thu thuần</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgRevenue.paginatedItems.map((r: RevenuePoint) => (
                        <tr key={r.period}>
                          <td><strong>{r.period}</strong></td>
                          <td className="num">{formatNumber(r.orders)} đơn</td>
                          <td className="num font-bold">{formatVnd(r.grossRevenue)}</td>
                          <td className="num" style={{ color: r.refunded > 0 ? '#dc2626' : undefined }}>
                            {r.refunded > 0 ? `-${formatVnd(r.refunded)}` : '0 đ'}
                          </td>
                          <td className="num font-bold" style={{ color: '#059669' }}>
                            {formatVnd(r.netRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgRevenue.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 7. SẢN PHẨM BÁN CHẠY */}
        {tab === 'top-products' && (
          <div>
            <LoadState loading={prodLoading} error={prodError} empty={!prodLoading && (!topProducts || topProducts.length === 0)} />
            {topProducts && topProducts.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Sản phẩm bán chạy nhất (#1)"
                    value={topProducts[0]?.productName ?? '—'}
                    icon="box"
                    hint={`${formatNumber(topProducts[0]?.quantity ?? 0)} đôi đã bán`}
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng số lượng đã bán"
                    value={`${formatNumber(topProducts.reduce((s, p) => s + p.quantity, 0))} đôi`}
                    icon="cart"
                    tone="green"
                  />
                  <StatCard
                    label="Tổng doanh thu sản phẩm"
                    value={formatVnd(topProducts.reduce((s, p) => s + p.revenue, 0))}
                    icon="wallet"
                    tone="violet"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Hạng</th>
                        <th>Sản phẩm</th>
                        <th className="num">Số lượng bán</th>
                        <th>Tỷ trọng doanh số</th>
                        <th className="num font-bold">Doanh thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgProducts.paginatedItems.map((p: TopProduct, idx: number) => {
                        const rank = (pgProducts.page - 1) * pgProducts.pageSize + idx + 1;
                        const maxQty = topProducts[0]?.quantity || 1;
                        return (
                          <tr key={p.productId}>
                            <td>
                              <span className={`badge ${rank === 1 ? 'badge--ok' : rank <= 3 ? 'badge--info' : ''}`}>
                                #{rank}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Thumb src={p.imageUrl} alt={p.productName} />
                                <strong>{p.productName}</strong>
                              </div>
                            </td>
                            <td className="num font-bold">{formatNumber(p.quantity)} đôi</td>
                            <td><Meter value={p.quantity} max={maxQty} /></td>
                            <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(p.revenue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pgProducts.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 8. TRẠNG THÁI ĐƠN HÀNG */}
        {tab === 'orders' && (
          <div>
            <LoadState loading={ordLoading} error={ordError} empty={!ordLoading && !ordersReport} />
            {ordersReport && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng số đơn ghi nhận"
                    value={`${formatNumber(ordersReport.byStatus.reduce((s, r) => s + r.count, 0))} đơn`}
                    icon="cart"
                    tone="blue"
                  />
                  <StatCard
                    label="Đơn chờ xử lý quá 24h"
                    value={`${formatNumber(ordersReport.overduePending)} đơn`}
                    icon="alert"
                    tone={ordersReport.overduePending > 0 ? 'red' : 'green'}
                    hint={ordersReport.overduePending > 0 ? 'Cần xử lý gấp!' : 'Không có đơn tồn'}
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Trạng thái đơn hàng</th>
                        <th className="num">Số lượng</th>
                        <th>Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const total = ordersReport.byStatus.reduce((s, r) => s + r.count, 0) || 1;
                        return ordersReport.byStatus.map((s) => (
                          <tr key={s.status}>
                            <td><strong>{s.status}</strong></td>
                            <td className="num font-bold">{formatNumber(s.count)} đơn</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Meter value={s.count} max={total} />
                                <span className="small muted">{Math.round((s.count / total) * 100)}%</span>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* 9. NHẬP XUẤT TỒN */}
        {tab === 'inventory-movement' && (
          <div>
            <LoadState loading={movLoading} error={movError} empty={!movLoading && (!movementData || movementData.length === 0)} />
            {movementData && movementData.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng biến thể theo dõi"
                    value={`${formatNumber(movementData.length)} biến thể`}
                    icon="box"
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng số lượng nhập trong kỳ"
                    value={`+${formatNumber(movementData.reduce((s, m) => s + m.imported, 0))} đôi`}
                    icon="trend"
                    tone="green"
                  />
                  <StatCard
                    label="Tổng số lượng xuất trong kỳ"
                    value={`-${formatNumber(movementData.reduce((s, m) => s + m.exported, 0))} đôi`}
                    icon="cart"
                    tone="orange"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Sản phẩm</th>
                        <th>Phân loại</th>
                        <th className="num">Tồn đầu kỳ</th>
                        <th className="num" style={{ color: '#059669' }}>Nhập trong kỳ</th>
                        <th className="num" style={{ color: '#dc2626' }}>Xuất trong kỳ</th>
                        <th className="num font-bold">Tồn cuối kỳ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgMovement.paginatedItems.map((m: InventoryMovementRow) => (
                        <tr key={m.variantId}>
                          <td><code>{m.sku}</code></td>
                          <td><strong>{m.productName}</strong></td>
                          <td>{m.sizeLabel} / {m.colorName}</td>
                          <td className="num">{formatNumber(m.openingStock)}</td>
                          <td className="num" style={{ color: '#059669', fontWeight: 600 }}>+{formatNumber(m.imported)}</td>
                          <td className="num" style={{ color: '#dc2626', fontWeight: 600 }}>-{formatNumber(m.exported)}</td>
                          <td className="num font-bold">{formatNumber(m.closingStock)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgMovement.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 10. CẢNH BÁO TỒN KHO */}
        {tab === 'stock' && (
          <div>
            <LoadState loading={stkLoading} error={stkError} empty={!stkLoading && !stockReport} />
            {stockReport && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Biến thể sắp hết hàng (≤ 5)"
                    value={`${stockReport.lowStock.length} mẫu`}
                    icon="alert"
                    tone={stockReport.lowStock.length > 0 ? 'red' : 'green'}
                    hint="Cần lập phiếu nhập kho bổ sung"
                  />
                  <StatCard
                    label="Biến thể tồn đọng (> 30 ngày)"
                    value={`${stockReport.staleStock.length} mẫu`}
                    icon="box"
                    tone={stockReport.staleStock.length > 0 ? 'orange' : 'green'}
                    hint="Cần áp dụng khuyến mãi / kích cầu"
                  />
                </div>

                <h4 style={{ margin: '16px 0 8px' }}>Danh sách sản phẩm sắp hết hàng</h4>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Sản phẩm</th>
                        <th>Phân loại</th>
                        <th className="num font-bold">Tồn kho hiện tại</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgStockLow.paginatedItems.map((s) => (
                        <tr key={s.variantId}>
                          <td><code>{s.sku}</code></td>
                          <td><strong>{s.productName}</strong></td>
                          <td>{s.sizeLabel} / {s.colorName}</td>
                          <td className="num font-bold" style={{ color: s.stockQuantity === 0 ? '#dc2626' : '#d97706' }}>
                            {formatNumber(s.stockQuantity)} đôi
                          </td>
                          <td>
                            <span className={`badge ${s.stockQuantity === 0 ? 'badge--danger' : 'badge--warning'}`}>
                              {s.stockQuantity === 0 ? 'Hết hàng' : 'Sắp hết'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgStockLow.paginationControl}

                <h4 style={{ margin: '24px 0 8px' }}>Danh sách sản phẩm tồn đọng (&gt; 30 ngày)</h4>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Sản phẩm</th>
                        <th>Phân loại</th>
                        <th className="num font-bold">Tồn kho hiện tại</th>
                        <th>Lần xuất nhập cuối</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgStockStale.paginatedItems.map((s) => (
                        <tr key={s.variantId}>
                          <td><code>{s.sku}</code></td>
                          <td><strong>{s.productName}</strong></td>
                          <td>{s.sizeLabel} / {s.colorName}</td>
                          <td className="num font-bold">{formatNumber(s.stockQuantity)} đôi</td>
                          <td>{s.lastMovementAt ? new Date(s.lastMovementAt).toLocaleDateString('vi-VN') : 'Chưa có'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pgStockStale.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 11. KHÁCH HÀNG THÂN THIẾT */}
        {tab === 'top-customers' && (
          <div>
            <LoadState loading={cusLoading} error={cusError} empty={!cusLoading && (!topCustomers || topCustomers.length === 0)} />
            {topCustomers && topCustomers.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Khách hàng hàng đầu (#1)"
                    value={topCustomers[0]?.fullName ?? '—'}
                    icon="wallet"
                    hint={`Đã mua ${formatVnd(topCustomers[0]?.totalPurchased ?? 0)}`}
                    tone="blue"
                  />
                  <StatCard
                    label="Tổng tiền mua của Top"
                    value={formatVnd(topCustomers.reduce((s, c) => s + c.totalPurchased, 0))}
                    icon="trend"
                    tone="green"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Hạng</th>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        <th className="num">Số đơn hoàn tất</th>
                        <th>Tỷ trọng chi tiêu</th>
                        <th className="num font-bold">Tổng tiền mua</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgCustomers.paginatedItems.map((c: TopCustomer, idx: number) => {
                        const rank = (pgCustomers.page - 1) * pgCustomers.pageSize + idx + 1;
                        const maxSpend = topCustomers[0]?.totalPurchased || 1;
                        return (
                          <tr key={c.customerId}>
                            <td>
                              <span className={`badge ${rank === 1 ? 'badge--ok' : rank <= 3 ? 'badge--info' : ''}`}>
                                #{rank}
                              </span>
                            </td>
                            <td><strong>{c.fullName}</strong></td>
                            <td>{c.phone || '—'}</td>
                            <td className="num">{formatNumber(c.orders)} đơn</td>
                            <td><Meter value={c.totalPurchased} max={maxSpend} /></td>
                            <td className="num font-bold" style={{ color: '#059669' }}>{formatVnd(c.totalPurchased)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pgCustomers.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 12. DOANH SỐ NHÂN VIÊN */}
        {tab === 'employees' && (
          <div>
            <LoadState loading={empLoading} error={empError} empty={!empLoading && (!employeeSales || employeeSales.length === 0)} />
            {employeeSales && employeeSales.length > 0 && (
              <>
                <div className="stats-grid" style={{ marginBottom: 20 }}>
                  <StatCard
                    label="Tổng nhân viên ghi nhận"
                    value={`${employeeSales.length} người`}
                    icon="wallet"
                    tone="blue"
                  />
                  <StatCard
                    label="Nhân viên xuất sắc nhất (#1)"
                    value={employeeSales[0]?.fullName ?? '—'}
                    icon="trend"
                    hint={formatVnd(employeeSales[0]?.revenue ?? 0)}
                    tone="green"
                  />
                </div>

                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>Hạng</th>
                        <th>Nhân viên</th>
                        <th className="num">Số đơn đã lập</th>
                        <th>Tỷ trọng doanh số</th>
                        <th className="num font-bold">Doanh số đạt được</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pgEmployees.paginatedItems.map((e: EmployeeSales, idx: number) => {
                        const rank = (pgEmployees.page - 1) * pgEmployees.pageSize + idx + 1;
                        const maxRev = employeeSales[0]?.revenue || 1;
                        return (
                          <tr key={e.employeeId}>
                            <td>
                              <span className={`badge ${rank === 1 ? 'badge--ok' : rank <= 3 ? 'badge--info' : ''}`}>
                                #{rank}
                              </span>
                            </td>
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
                {pgEmployees.paginationControl}
              </>
            )}
          </div>
        )}

        {/* 13. TỶ LỆ TRẢ HÀNG */}
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
                      {pgReturns.paginatedItems.map((r: ReturnRate) => (
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
                {pgReturns.paginationControl}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
