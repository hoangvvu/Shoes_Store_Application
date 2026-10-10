import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthInput } from '../components/AuthInput';
import { LockIcon, UserIcon } from '../components/Icons';
import { ROLE_HOME, isEmployeeRole } from '../config/roles';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/useAuthStore';
import { getErrorMessage } from '../utils/error';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.login({ username: username.trim(), password });
      const role = res.user.role;
      if (!isEmployeeRole(role)) {
        setError('Tài khoản không có quyền truy cập trang quản trị');
        return;
      }
      setSession(res, remember);
      navigate(ROLE_HOME[role], { replace: true }); // mỗi vai trò vào đúng layout của mình
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <h1 className="login-card__title">Đăng nhập</h1>

        <AuthInput
          icon={<UserIcon />}
          type="text"
          placeholder="Tên đăng nhập"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <AuthInput
          icon={<LockIcon />}
          type="password"
          placeholder="Mật khẩu"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="login-card__row">
          <label className="login-card__remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Ghi nhớ đăng nhập
          </label>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setError('');
              setInfo('Vui lòng liên hệ quản trị viên để được cấp lại mật khẩu.');
            }}
          >
            Quên mật khẩu?
          </button>
        </div>

        {error && <p className="login-card__msg login-card__msg--error" role="alert">{error}</p>}
        {info && <p className="login-card__msg login-card__msg--info">{info}</p>}

        <button type="submit" className="login-card__submit" disabled={loading}>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}
