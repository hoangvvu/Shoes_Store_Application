import { Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderPage } from '../components/common/PlaceholderPage';
import { ROLE_HOME, isEmployeeRole } from '../config/roles';
import AdminLayout from '../layouts/AdminLayout';
import SalesLayout from '../layouts/SalesLayout';
import WarehouseLayout from '../layouts/WarehouseLayout';

// Admin pages
import AdminCatalogPage from '../pages/admin/AdminCatalogPage';
import AdminCustomerDetailPage from '../pages/admin/AdminCustomerDetailPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
import AdminEmployeeDetailPage from '../pages/admin/AdminEmployeeDetailPage';
import AdminEmployeesPage from '../pages/admin/AdminEmployeesPage';
import AdminHomePage from '../pages/admin/AdminHomePage';
import AdminInventoryPage from '../pages/admin/AdminInventoryPage';
import AdminReviewsPage from '../pages/admin/AdminReviewsPage';
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminProductDetailPage from '../pages/admin/AdminProductDetailPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminReceiptsPage from '../pages/admin/AdminReceiptsPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import AdminSuppliersPage from '../pages/admin/AdminSuppliersPage';

// Sales pages
import SalesCustomerDetailPage from '../pages/sales/SalesCustomerDetailPage';
import SalesCustomersPage from '../pages/sales/SalesCustomersPage';
import SalesHomePage from '../pages/sales/SalesHomePage';
import SalesReviewsPage from '../pages/sales/SalesReviewsPage';
import SalesOrderDetailPage from '../pages/sales/SalesOrderDetailPage';
import SalesOrdersPage from '../pages/sales/SalesOrdersPage';
import SalesProductDetailPage from '../pages/sales/SalesProductDetailPage';
import SalesProductsPage from '../pages/sales/SalesProductsPage';
import SalesReportsPage from '../pages/sales/SalesReportsPage';

// Warehouse pages
import WarehouseHomePage from '../pages/warehouse/WarehouseHomePage';
import WarehouseInventoryPage from '../pages/warehouse/WarehouseInventoryPage';
import WarehouseReceiptsPage from '../pages/warehouse/WarehouseReceiptsPage';
import WarehouseReportsPage from '../pages/warehouse/WarehouseReportsPage';
import WarehouseStockCardsPage from '../pages/warehouse/WarehouseStockCardsPage';
import WarehouseStocktakePage from '../pages/warehouse/WarehouseStocktakePage';
import WarehouseSuppliersPage from '../pages/warehouse/WarehouseSuppliersPage';

// Common pages
import LoginPage from '../pages/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const home = user && isEmployeeRole(user.role) ? ROLE_HOME[user.role] : '/login';

  return (
    <Routes>
      <Route path="/login" element={user && isEmployeeRole(user.role) ? <Navigate to={home} replace /> : <LoginPage />} />

      {/* ADMIN ROUTES */}
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="employees" element={<AdminEmployeesPage />} />
          <Route path="employees/:id" element={<AdminEmployeeDetailPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/:id" element={<AdminProductDetailPage />} />
          <Route path="catalog" element={<AdminCatalogPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="suppliers" element={<AdminSuppliersPage />} />
          <Route path="receipts" element={<AdminReceiptsPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<PlaceholderPage role="ADMIN" />} />
        </Route>
      </Route>

      {/* SALES ROUTES */}
      <Route element={<ProtectedRoute roles={['SALES']} />}>
        <Route path="/sales" element={<SalesLayout />}>
          <Route index element={<SalesHomePage />} />
          <Route path="customers" element={<SalesCustomersPage />} />
          <Route path="customers/:id" element={<SalesCustomerDetailPage />} />
          <Route path="orders" element={<SalesOrdersPage />} />
          <Route path="orders/:id" element={<SalesOrderDetailPage />} />
          <Route path="products" element={<SalesProductsPage />} />
          <Route path="products/:id" element={<SalesProductDetailPage />} />
          <Route path="reviews" element={<SalesReviewsPage />} />
          <Route path="reports" element={<SalesReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<PlaceholderPage role="SALES" />} />
        </Route>
      </Route>

      {/* WAREHOUSE ROUTES */}
      <Route element={<ProtectedRoute roles={['WAREHOUSE']} />}>
        <Route path="/warehouse" element={<WarehouseLayout />}>
          <Route index element={<WarehouseHomePage />} />
          <Route path="inventory" element={<WarehouseInventoryPage />} />
          <Route path="receipts" element={<WarehouseReceiptsPage />} />
          <Route path="suppliers" element={<WarehouseSuppliersPage />} />
          <Route path="stocktake" element={<WarehouseStocktakePage />} />
          <Route path="stock-cards" element={<WarehouseStockCardsPage />} />
          <Route path="reports" element={<WarehouseReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<PlaceholderPage role="WAREHOUSE" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
