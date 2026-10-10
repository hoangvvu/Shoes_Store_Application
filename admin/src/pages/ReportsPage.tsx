import { useEffect, useState } from 'react';
import { reportService } from '../services/report.service';
import {
  RevenueItem,
  TopProductItem,
  TopCustomerItem,
  EmployeeSalesItem,
  ReturnRateItem,
} from '../types';
import {
  FileSpreadsheet,
  TrendingUp,
  Award,
  Users,
  Briefcase,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'topProducts' | 'topCustomers' | 'employees' | 'returns'>('revenue');
  const [loading, setLoading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');

  // Report Data States
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomerItem[]>([]);
  const [employeeSales, setEmployeeSales] = useState<EmployeeSalesItem[]>([]);
  const [returnRates, setReturnRates] = useState<ReturnRateItem[]>([]);

  const loadCurrentReport = async () => {
    setLoading(true);
    try {
      const params = {
        from: fromDate || undefined,
        to: toDate || undefined,
      };

      if (activeTab === 'revenue') {
        const res = await reportService.getRevenue({ ...params, groupBy });
        if (res.success) setRevenueData(res.data);
      } else if (activeTab === 'topProducts') {
        const res = await reportService.getTopProducts({ ...params, limit: 15 });
        if (res.success) setTopProducts(res.data);
      } else if (activeTab === 'topCustomers') {
        const res = await reportService.getTopCustomers({ limit: 15 });
        if (res.success) setTopCustomers(res.data);
      } else if (activeTab === 'employees') {
        const res = await reportService.getEmployeeSales(params);
        if (res.success) setEmployeeSales(res.data);
      } else if (activeTab === 'returns') {
        const res = await reportService.getReturnRates(params);
        if (res.success) setReturnRates(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentReport();
  }, [activeTab, fromDate, toDate, groupBy]);

  const getExportUrl = () => {
    const reportNameMap: Record<string, string> = {
      revenue: 'revenue',
      topProducts: 'top-products',
      topCustomers: 'top-customers',
      employees: 'employees',
      returns: 'returns',
    };
    const reportType = reportNameMap[activeTab] || 'revenue';
    return reportService.exportExcelUrl(reportType, {
      from: fromDate || '',
      to: toDate || '',
      groupBy: activeTab === 'revenue' ? groupBy : '',
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
            📊 Trung Tâm Báo Cáo Doanh Số & Vận Hành (M15)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            Tổng hợp dữ liệu kinh doanh đa chiều, hỗ trợ tải về bảng tính Excel (.xlsx) phục vụ kế toán
          </p>
        </div>

        <a
          href={getExportUrl()}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#10b981',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
          }}
        >
          <FileSpreadsheet size={18} />
          Xuất Báo Cáo Ra Excel (.xlsx)
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'revenue', label: 'Doanh Thu (M15.1)', icon: TrendingUp },
          { id: 'topProducts', label: 'Sản Phẩm Bán Chạy (M15.2)', icon: Award },
          { id: 'topCustomers', label: 'Khách Thân Thiết (M15.6)', icon: Users },
          { id: 'employees', label: 'Doanh Số Nhân Viên (M15.7)', icon: Briefcase },
          { id: 'returns', label: 'Tỷ Lệ Đổi Trả (M15.8)', icon: RotateCcw },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: isActive ? '#2563eb' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          padding: '14px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
          <span>Từ ngày:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
          <span>Đến ngày:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        {activeTab === 'revenue' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
            <span>Gom nhóm theo:</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="day">Theo Từng Ngày</option>
              <option value="month">Theo Từng Tháng</option>
            </select>
          </div>
        )}

        <button
          onClick={loadCurrentReport}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '13px',
            marginLeft: 'auto',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Tải lại
        </button>
      </div>

      {/* Tables Container */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {/* Tab 1: Doanh Thu */}
        {activeTab === 'revenue' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 16px' }}>Kỳ (Ngày/Tháng)</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Số Đơn Hàng Giao</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Tổng Tiền Hàng</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: '#dc2626' }}>Giảm Giá / Voucher</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Doanh Thu Gộp</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: '#b45309' }}>Hoàn Tiền (Refunds)</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>Doanh Thu Thuần</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tổng hợp báo cáo doanh thu...</td>
                </tr>
              ) : revenueData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Chưa có số liệu doanh thu trong khoảng thời gian này.</td>
                </tr>
              ) : (
                revenueData.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{r.period}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{r.totalOrders} đơn</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{Number(r.grossTotal).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#dc2626' }}>-{Number(r.totalDiscount).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{Number(r.grossRevenue).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#b45309' }}>-{Number(r.totalRefunded).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#15803d' }}>{Number(r.netRevenue).toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab 2: Top Sản Phẩm */}
        {activeTab === 'topProducts' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 16px' }}>Hạng</th>
                <th style={{ padding: '14px 16px' }}>Tên Sản Phẩm Giày</th>
                <th style={{ padding: '14px 16px' }}>Danh Mục / Thương Hiệu</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Đơn Giá</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: '#2563eb' }}>Số Lượng Đã Bán</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>Doanh Thu Mang Về</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải...</td>
                </tr>
              ) : topProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Chưa có số liệu.</td>
                </tr>
              ) : (
                topProducts.map((p, i) => (
                  <tr key={p.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: i === 0 ? '#f59e0b' : '#64748b' }}>#{i + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{p.productName}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{p.categoryName || '—'} • {p.brandName || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{Number(p.currentPrice).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{p.totalSoldQuantity} đôi</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{Number(p.totalSalesAmount || 0).toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab 3: Top Khách Hàng */}
        {activeTab === 'topCustomers' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 16px' }}>Hạng</th>
                <th style={{ padding: '14px 16px' }}>Họ Và Tên Khách Hàng</th>
                <th style={{ padding: '14px 16px' }}>Số Điện Thoại</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Số Đơn Đã Giao</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>Tổng Tiền Đã Mua</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải...</td>
                </tr>
              ) : topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Chưa có số liệu khách hàng.</td>
                </tr>
              ) : (
                topCustomers.map((c, i) => (
                  <tr key={c.customerId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: i === 0 ? '#f59e0b' : '#64748b' }}>#{i + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.fullName}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{c.totalDeliveredOrders} đơn</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{Number(c.totalPurchased || 0).toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab 4: Doanh Số Theo Nhân Viên */}
        {activeTab === 'employees' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 16px' }}>Mã NV</th>
                <th style={{ padding: '14px 16px' }}>Họ Và Tên Nhân Viên</th>
                <th style={{ padding: '14px 16px' }}>Số Điện Thoại</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Lương Cơ Bản</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Số Đơn Lập</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>Doanh Thu Đạt Được</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải...</td>
                </tr>
              ) : employeeSales.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Chưa có số liệu.</td>
                </tr>
              ) : (
                employeeSales.map((e) => (
                  <tr key={e.employeeId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>#{e.employeeId}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{e.fullName}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{e.phone || '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{Number(e.baseSalary || 0).toLocaleString('vi-VN')} đ</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{e.totalOrders} đơn</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>{Number(e.totalRevenue || 0).toLocaleString('vi-VN')} đ</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Tab 5: Tỷ Lệ Đổi Trả */}
        {activeTab === 'returns' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '14px 16px' }}>Mã SP</th>
                <th style={{ padding: '14px 16px' }}>Tên Sản Phẩm Giày</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>Số Lượng Bán</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', color: '#dc2626' }}>Số Lượng Trả Lại</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700 }}>Tỷ Lệ Đổi Trả (%)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải...</td>
                </tr>
              ) : returnRates.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Chưa có yêu cầu đổi trả nào.</td>
                </tr>
              ) : (
                returnRates.map((item) => (
                  <tr key={item.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>#{item.productId}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{item.productName}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>{item.totalSold} đôi</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>{item.totalReturned} đôi</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '12px',
                          backgroundColor: item.returnRatePercent > 10 ? '#fee2e2' : '#f1f5f9',
                          color: item.returnRatePercent > 10 ? '#dc2626' : '#475569',
                        }}
                      >
                        {item.returnRatePercent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
