import { useState } from 'react';
import { useAuthStore } from './store/useAuthStore';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import ProductsPage from './pages/ProductsPage';
import CatalogPage from './pages/CatalogPage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseReceiptsPage from './pages/PurchaseReceiptsPage';
import InventoryPage from './pages/InventoryPage';
import ReportsPage from './pages/ReportsPage';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Layers,
  Building2,
  FileDown,
  Boxes,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'dashboard' | 'employees' | 'products' | 'catalog' | 'suppliers' | 'receipts' | 'inventory' | 'reports'
  >('dashboard');

  const { user } = useAuthStore();

  const navItems = [
    { id: 'dashboard', label: 'Bảng Điều Khiển (M15)', icon: LayoutDashboard },
    { id: 'employees', label: 'Quản Lý Nhân Viên (M3)', icon: Users },
    { id: 'products', label: 'Sản Phẩm & Biến Thể (M4)', icon: ShoppingBag },
    { id: 'catalog', label: 'Thuộc Tính Danh Mục (M4)', icon: Layers },
    { id: 'suppliers', label: 'Nhà Cung Cấp (M5)', icon: Building2 },
    { id: 'receipts', label: 'Phiếu Nhập Kho (M5)', icon: FileDown },
    { id: 'inventory', label: 'Tồn Kho & Thẻ Kho (M6)', icon: Boxes },
    { id: 'reports', label: 'Báo Cáo Chuyên Sâu (M15)', icon: BarChart3 },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'inherit' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Brand Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
                color: '#ffffff',
              }}
            >
              👟
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '0.3px', color: '#ffffff' }}>
                SHOES STORE
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Admin Management Portal</div>
            </div>
          </div>
        </div>

        {/* Assigned Responsibilities Indicator */}
        <div style={{ padding: '12px 16px', margin: '12px 14px', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Nhiệm Vụ Phân Công
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
            Vũ Việt Hoàng (M3, 4, 5, 6, 15)
          </div>
        </div>

        {/* Nav list */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? '#2563eb' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.15s',
                }}
              >
                <Icon size={18} />
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div style={{ padding: '16px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              H
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{user?.fullName || 'Admin User'}</div>
              <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> Vai trò: ADMIN
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden' }}>
        {/* Top Navbar */}
        <header
          style={{
            height: '60px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
            <span>Hệ thống bán giày Web – Mobile</span>
            <span>/</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {navItems.find((n) => n.id === currentTab)?.label}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              API v1 Online
            </span>
          </div>
        </header>

        {/* Tab View */}
        <div style={{ paddingBottom: '40px' }}>
          {currentTab === 'dashboard' && <DashboardPage />}
          {currentTab === 'employees' && <EmployeesPage />}
          {currentTab === 'products' && <ProductsPage />}
          {currentTab === 'catalog' && <CatalogPage />}
          {currentTab === 'suppliers' && <SuppliersPage />}
          {currentTab === 'receipts' && <PurchaseReceiptsPage />}
          {currentTab === 'inventory' && <InventoryPage />}
          {currentTab === 'reports' && <ReportsPage />}
        </div>
      </main>
    </div>
  );
}
