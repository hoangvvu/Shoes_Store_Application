import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MENUS } from '../../config/menus';
import { ROLE_LABEL } from '../../config/roles';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { EmployeeRole } from '../../types/auth';

interface Props {
  role: EmployeeRole;
  title: string;
  accent: string;
}

/** Khung dùng chung; AdminLayout / SalesLayout / WarehouseLayout chỉ khác menu, tiêu đề và màu nhấn. */
export function SidebarLayout({ role, title, accent }: Props) {
  const { user, clear } = useAuthStore();
  const navigate = useNavigate();

  async function logout() {
    await authService.logout();
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="shell" style={{ ['--accent-role' as string]: accent }}>
      <aside className="shell__sidebar">
        <div className="shell__brand">OURAN</div>
        <div className="shell__title">{title}</div>
        <nav className="shell__nav">
          {MENUS[role].map((m) => (
            <NavLink key={m.path} to={m.path} end={m.path === `/${role.toLowerCase()}`} className={({ isActive }) => (isActive ? 'active' : '')}>
              {m.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="shell__main">
        <header className="shell__header">
          <span>
            {user?.fullName} · <strong>{ROLE_LABEL[role]}</strong>
          </span>
          <button onClick={logout}>Đăng xuất</button>
        </header>
        <main className="shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
