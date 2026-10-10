import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MENUS } from '../../config/menus';
import { ROLE_SHORT } from '../../config/roles';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/useAuthStore';
import type { EmployeeRole } from '../../types/auth';
import { NavIcon } from './NavIcon';

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

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

/** Khung dùng chung; AdminLayout / SalesLayout / WarehouseLayout khác nhau ở menu, tiêu đề và màu nhấn. */
export function SidebarLayout({ role, title, accent }: Props) {
  const { user, clear } = useAuthStore();
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

  const home = MENUS[role][0].path;

  return (
    <div className={`shell ${open ? '' : 'shell--closed'}`} style={{ ['--accent-role' as string]: accent }}>
      <aside className="sidebar" aria-hidden={!open}>
        <div className="sidebar__brand">{title}</div>
        <nav className="sidebar__nav">
          {MENUS[role].map((m) => (
            <NavLink key={m.path} to={m.path} end={m.path === home} tabIndex={open ? 0 : -1} className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}>
              <NavIcon name={m.icon} />
              <span>{m.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="backdrop" onClick={toggle} />

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__left">
            <button className="icon-btn" onClick={toggle} aria-label={open ? 'Ẩn thanh bên' : 'Hiện thanh bên'} aria-expanded={open}>
              <NavIcon name="menu" size={22} />
            </button>
            <span className="topbar__brand">
              <NavIcon name="dashboard" size={20} />
              OURAN
            </span>
          </div>
          <div className="topbar__right">
            <div className="userbox">
              <span className="avatar">{initials(user?.fullName ?? '')}</span>
              <span className="userbox__text">
                <strong>{user?.username}</strong>
                <small>{ROLE_SHORT[role]}</small>
              </span>
            </div>
            <span className="topbar__divider" />
            <button className="logout-btn" onClick={logout}>
              <NavIcon name="logout" size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
