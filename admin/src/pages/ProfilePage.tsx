import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavIcon } from '../components/common/NavIcon';
import { ChangePasswordCard } from '../components/profile/ChangePasswordCard';
import { ProfileInfoCard } from '../components/profile/ProfileInfoCard';
import { ROLE_LABEL, isEmployeeRole } from '../config/roles';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';

type Tab = 'info' | 'password';

/** Hồ sơ cá nhân dùng chung cho Admin / Bán hàng / Kho: cột trái (avatar + điều hướng + đăng xuất), cột phải (nội dung). */
export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('info');

  if (!user || !isEmployeeRole(user.role)) return null;
  const role = user.role;

  async function logout() {
    await authService.logout();
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="profile">
      <aside className="card profile__side">
        <div className="profile__avatar"><NavIcon name="user" size={44} /></div>
        <h2 className="profile__name">{user.fullName}</h2>
        <p className="muted profile__role">{ROLE_LABEL[role]}</p>

        <nav className="profile__nav">
          <button className={`profile__tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>
            <NavIcon name="user" size={18} />
            Thông tin tài khoản
          </button>
          <button className={`profile__tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            <NavIcon name="key" size={18} />
            Đổi mật khẩu
          </button>
        </nav>

        <button className="profile__logout" onClick={logout}>
          <NavIcon name="logout" size={18} />
          Đăng xuất
        </button>
      </aside>

      <section className="card profile__main">
        {tab === 'info' ? <ProfileInfoCard role={role} /> : <ChangePasswordCard />}
      </section>
    </div>
  );
}
