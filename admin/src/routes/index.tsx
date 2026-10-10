import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import { useAuthStore } from '../store/useAuthStore';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRoutes() {
  const user = useAuthStore((s) => s.user);
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute roles={['ADMIN', 'STAFF']} />}>
        <Route path="/" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
