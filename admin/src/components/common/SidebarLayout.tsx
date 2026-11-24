import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MENUS } from '../../config/menus';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { EmployeeRole } from '../../types/auth';
import { NavIcon } from './NavIcon';
import { UserMenu } from './UserMenu';

interface Props {
  role: EmployeeRole;
  /** Tên hiển thị trên đầu sidebar, ví dụ "Admin", "Bán hàng", "Kho". */
  title: string;
  /** Màu nhấn riêng của từng vai trò. */
  accent: string;
}

const STORAGE_KEY = 'ouran_sidebar_open';
const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

function readOpen(): boolean {
  if (!isDesktop()) return false; // màn hình nhỏ: mặc định ẩn
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Khung dùng chung; AdminLayout / SalesLayout / WarehouseLayout khác nhau ở menu, tiêu đề và màu nhấn. */
export function SidebarLayout({ role, title, accent }: Props) {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(readOpen);

  const toggle = () =>
    setOpen((v) => {
      try {
        if (isDesktop()) localStorage.setItem(STORAGE_KEY, v ? '0' : '1');
      } catch {
        /* bỏ qua */
      }
      return !v;
    });

  // Màn hình nhỏ: chọn menu xong thì tự đóng sidebar
  useEffect(() => {
    if (!isDesktop()) setOpen(false);
  }, [pathname]);

  async function logout() {
    await authService.logout();
    clear();
    navigate('/login', { replace: true });
  }

  const navItems = MENUS[role];
  const home = navItems[0]?.path ?? `/${role.toLowerCase()}`;

  return (
    <div className={`shell ${open ? '' : 'shell--closed'}`} style={{ ['--accent-role' as string]: accent }}>
      <aside className="sidebar" aria-hidden={!open}>
        <div className="sidebar__brand">{title}</div>
        <nav className="sidebar__nav">
          {navItems.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              end={m.path === home}
              tabIndex={open ? 0 : -1}
              className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
            >
              <NavIcon name={m.icon} />
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <UserMenu role={role} profilePath={`${home}/profile`} onLogout={logout} />
      </aside>
      <div className="backdrop" onClick={toggle} />

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-btn" onClick={toggle} aria-label={open ? 'Ẩn thanh bên' : 'Hiện thanh bên'} aria-expanded={open}>
              <NavIcon name="menu" size={22} />
            </button>
            <span className="topbar__greeting">
              Xin chào, <strong>{user?.fullName}</strong>
            </span>
          </div>
          <div className="topbar__right">
            <span className="topbar__logo">
              <span className="topbar__logo-mark"><NavIcon name="dashboard" size={22} /></span>
              OURAN
            </span>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
