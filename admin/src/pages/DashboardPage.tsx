import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';

// Trang tạm sau đăng nhập; các module quản trị khác sẽ thay thế.
export default function DashboardPage() {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();

  async function logout() {
    await authService.logout();
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <main className="dash">
      <h1>Xin chào, {user?.fullName}</h1>
      <p>
        Vai trò: <strong>{user?.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</strong>
      </p>
      <button className="dash__logout" onClick={logout}>Đăng xuất</button>
    </main>
  );
}
