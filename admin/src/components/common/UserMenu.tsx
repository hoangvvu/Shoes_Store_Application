import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ROLE_SHORT } from '../../config/roles';
import { useAuthStore } from '../../store/useAuthStore';
import type { EmployeeRole } from '../../types/auth';
import { NavIcon } from './NavIcon';

interface Props {
  role: EmployeeRole;
  profilePath: string;
  onLogout: () => void;
}

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(-2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

/** Khung người dùng ở cuối sidebar: bấm để mở menu "Hồ sơ cá nhân" / "Đăng xuất". */
export function UserMenu({ role, profilePath, onLogout }: Props) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="usermenu" ref={ref}>
      {open && (
        <div className="usermenu__pop" role="menu">
          <NavLink to={profilePath} className="usermenu__item" role="menuitem" onClick={() => setOpen(false)}>
            <NavIcon name="user" size={18} />
            Hồ sơ cá nhân
          </NavLink>
          <button className="usermenu__item usermenu__item--danger" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
            <NavIcon name="logout" size={18} />
            Đăng xuất
          </button>
        </div>
      )}
      <button className="usermenu__btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{initials(user?.fullName ?? '')}</span>
        <span className="userbox__text">
          <strong>{user?.username}</strong>
          <small>{ROLE_SHORT[role]}</small>
        </span>
        <svg className={`usermenu__chev ${open ? 'open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 15l6-6 6 6" />
        </svg>
      </button>
    </div>
  );
}
