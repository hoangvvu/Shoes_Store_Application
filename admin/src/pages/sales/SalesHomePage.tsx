import { useAuthStore } from '../../store/useAuthStore';

export default function SalesHomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      <h1>Xin chào, {user?.fullName}</h1>
      <p className="muted">Bạn đang dùng giao diện Bán hàng: POS, đơn hàng, khách hàng, thanh toán và đổi trả.</p>
    </>
  );
}
