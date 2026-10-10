import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROLE_HOME, isEmployeeRole } from '../config/roles';
import { useAuthStore } from '../store/useAuthStore';
import type { RoleName } from '../types/auth';

/**
 * Route guard theo vai trò. Chưa đăng nhập -> /login; đăng nhập nhưng sai khu vực -> về trang của chính vai trò.
 * Đây chỉ là tiện ích UI: backend vẫn kiểm tra JWT + role ở từng endpoint.
 */
export function ProtectedRoute({ roles }: { roles: RoleName[] }) {
  const { user, accessToken } = useAuthStore();
  const location = useLocation();

  if (!user || !accessToken) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!isEmployeeRole(user.role)) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <Outlet />;
}
