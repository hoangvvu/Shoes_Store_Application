import { useEffect, useState } from 'react';
import { reportService } from '../services/report.service';
import { inventoryService } from '../services/inventory.service';
import { TopProductItem, StockItem, OrderSummary } from '../types';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  ShoppingBag,
  ArrowUpRight,
} from 'lucide-react';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalDeliveredOrders: 0,
    lowStockCount: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [topProdRes, ordersRes, lowStockRes, revRes] = await Promise.allSettled([
        reportService.getTopProducts({ limit: 5 }),
        reportService.getOrdersSummary(),
        inventoryService.getLowStock(10),
        reportService.getRevenue({ groupBy: 'month' }),
      ]);

      if (topProdRes.status === 'fulfilled' && topProdRes.value.success) {
        setTopProducts(topProdRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value.success) {
        setOrderSummary(ordersRes.value.data);
      }
      if (lowStockRes.status === 'fulfilled' && lowStockRes.value.success) {
        setLowStockItems(lowStockRes.value.data);
      }
      if (revRes.status === 'fulfilled' && revRes.value.success) {
        const revData = revRes.value.data;
        const totalRev = revData.reduce((acc, curr) => acc + (curr.netRevenue || 0), 0);
        const totalOrders = revData.reduce((acc, curr) => acc + (curr.totalOrders || 0), 0);
        setMetrics((prev) => ({
          ...prev,
          totalRevenue: totalRev,
          totalDeliveredOrders: totalOrders,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0f172a' }}>
            📊 Bảng Điều Khiển Kinh Doanh
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
            Hệ thống quản lý chuỗi bán giày thể thao đa kênh (M15 Dashboard & Analytics)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>

          <a
            href={reportService.exportExcelUrl('revenue', { groupBy: 'day' })}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
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
            <FileSpreadsheet size={16} />
            Xuất Excel Doanh Thu
          </a>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {/* KPI 1 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              TỔNG DOANH THU THUẦN
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '12px' }}>
            {Number(metrics.totalRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div style={{ fontSize: '13px', color: '#10b981', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} />
            Đã trừ các khoản hoàn tiền thành công
          </div>
        </div>

        {/* KPI 2 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              ĐƠN HÀNG ĐÃ GIAO
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}
            >
              <ShoppingBag size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '12px' }}>
            {metrics.totalDeliveredOrders} đơn hàng
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            Trạng thái DELIVERED
          </div>
        </div>

        {/* KPI 3 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              CẢNH BÁO HẾT HÀNG
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626', marginTop: '12px' }}>
            {lowStockItems.length} biến thể
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            Tồn kho ≤ 10 đôi (cần nhập kho gấp)
          </div>
        </div>

        {/* KPI 4 */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              ĐƠN CHỜ QUÁ HẠN (&gt;24H)
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
              }}
            >
              <Package size={20} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#d97706', marginTop: '12px' }}>
            {orderSummary?.overduePendingCount || 0} đơn
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
            Cần nhân viên xử lý xác nhận ngay
          </div>
        </div>
      </div>

      {/* Main Sections Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Top Products Box */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#1e293b' }}>
              🔥 Top Giày Bán Chạy Nhất (M15.2)
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Theo số lượng bán</span>
          </div>

          {topProducts.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>
              Chưa có dữ liệu bán hàng.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topProducts.map((p, index) => (
                <div
                  key={p.productId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: index === 0 ? '#f59e0b' : '#94a3b8',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                        {p.productName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {p.brandName || 'Giày thể thao'} • {Number(p.currentPrice).toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#2563eb' }}>
                      {p.totalSoldQuantity} đôi
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {Number(p.totalSalesAmount || 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Warning Box */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#dc2626' }}>
              ⚠️ Cảnh Báo Sắp Hết Hàng Trong Kho (M6.4)
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Ngưỡng ≤ 10 đôi</span>
          </div>

          {lowStockItems.length === 0 ? (
            <p style={{ color: '#16a34a', fontSize: '14px', textAlign: 'center', padding: '30px 0' }}>
              ✅ Tồn kho ổn định! Không có mặt hàng nào dưới ngưỡng báo động.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {lowStockItems.slice(0, 6).map((item) => (
                <div
                  key={item.variantId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#fff5f5',
                    border: '1px solid #fed7d7',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#991b1b' }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#7f1d1d' }}>
                      SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> • Size {item.sizeLabel} • {item.colorName}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '13px',
                    }}
                  >
                    Còn {item.stockQuantity} đôi
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
