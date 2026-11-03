import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const { user, isExpired, clear } = useAuthStore();

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isExpired()) {
        clear();
        window.alert('Phiên làm việc đã hết hạn (15 phút). Vui lòng đăng nhập lại.');
      }
    }, 15000); // kiểm tra mỗi 15 giây
    return () => clearInterval(interval);
  }, [user, isExpired, clear]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
