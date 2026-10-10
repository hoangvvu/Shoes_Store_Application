import { useAuthStore } from '../../store/useAuthStore';

export default function AdminHomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      <h1>Xin chào, {user?.fullName}</h1>
      <p className="muted">Bạn đang dùng giao diện Quản trị viên: toàn bộ module quản trị, báo cáo và nhật ký audit.</p>
    </>
  );
}
