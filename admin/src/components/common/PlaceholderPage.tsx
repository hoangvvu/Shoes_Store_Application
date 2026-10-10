import { useLocation } from 'react-router-dom';
import { MENUS } from '../../config/menus';
import type { EmployeeRole } from '../../types/auth';

/** Trang giữ chỗ cho module chưa làm; thay bằng trang thật khi module hoàn thành. */
export function PlaceholderPage({ role }: { role: EmployeeRole }) {
  const { pathname } = useLocation();
  const item = MENUS[role].find((m) => m.path === pathname);
  return (
    <>
      <h1>{item?.label ?? 'Không tìm thấy trang'}</h1>
      <p className="muted">{item ? 'Chức năng này sẽ được bổ sung ở module tương ứng.' : 'Đường dẫn không tồn tại.'}</p>
    </>
  );
}
