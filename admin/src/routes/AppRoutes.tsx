import { Navigate, Route, Routes } from 'react-router-dom';
import { PlaceholderPage } from '../components/common/PlaceholderPage';
import { ROLE_HOME, isEmployeeRole } from '../config/roles';
import AdminLayout from '../layouts/AdminLayout';
import SalesLayout from '../layouts/SalesLayout';
import WarehouseLayout from '../layouts/WarehouseLayout';
import AdminCustomerDetailPage from '../pages/admin/AdminCustomerDetailPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
import AdminHomePage from '../pages/admin/AdminHomePage';
import AdminReviewsPage from '../pages/admin/AdminReviewsPage';
import AdminOrderDetailPage from '../pages/admin/AdminOrderDetailPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import LoginPage from '../pages/LoginPage';
import ProfilePage from '../pages/ProfilePage';
import SalesCustomerDetailPage from '../pages/sales/SalesCustomerDetailPage';
import SalesCustomersPage from '../pages/sales/SalesCustomersPage';
import SalesHomePage from '../pages/sales/SalesHomePage';
import SalesReviewsPage from '../pages/sales/SalesReviewsPage';
import SalesOrderDetailPage from '../pages/sales/SalesOrderDetailPage';
import SalesOrdersPage from '../pages/sales/SalesOrdersPage';
import WarehouseHomePage from '../pages/warehouse/WarehouseHomePage';
import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  const home = user && isEmployeeRole(user.role) ? ROLE_HOME[user.role] : '/login';

  return (
    <Routes>
      <Route path="/login" element={user && isEmployeeRole(user.role) ? <Navigate to={home} replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<PlaceholderPage role="ADMIN" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['SALES']} />}>
        <Route path="/sales" element={<SalesLayout />}>
          <Route index element={<SalesHomePage />} />
          <Route path="customers" element={<SalesCustomersPage />} />
          <Route path="customers/:id" element={<SalesCustomerDetailPage />} />
          <Route path="orders" element={<SalesOrdersPage />} />
          <Route path="orders/:id" element={<SalesOrderDetailPage />} />
          <Route path="reviews" element={<SalesReviewsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<PlaceholderPage role="SALES" />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['WAREHOUSE']} />}>
        <Route path="/warehouse" element={<WarehouseLayout />}>
          <Route index element={<WarehouseHomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<PlaceholderPage role="WAREHOUSE" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
