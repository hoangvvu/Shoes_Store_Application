import { useAuthStore } from '../../store/useAuthStore';

export default function WarehouseHomePage() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      <h1>Xin chào, {user?.fullName}</h1>
      <p className="muted">Bạn đang dùng giao diện Kho: tồn kho, nhập kho, kiểm kê, thẻ kho và hàng trả.</p>
    </>
  );
}
