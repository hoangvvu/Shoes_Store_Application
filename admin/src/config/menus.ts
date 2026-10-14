import type { IconName } from '../components/common/NavIcon';
import type { EmployeeRole } from '../types/auth';

export interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
}

/** Menu theo ma trận phân quyền (docx mục 3): mỗi vai trò một menu riêng. Ẩn menu chỉ để gọn UI; backend mới là nơi chặn quyền. */
export const MENUS: Record<EmployeeRole, MenuItem[]> = {
  ADMIN: [
    { label: 'Dashboard', path: '/admin', icon: 'dashboard' },
    { label: 'Nhân viên & tài khoản', path: '/admin/employees', icon: 'users' },
    { label: 'Khách hàng', path: '/admin/customers', icon: 'user' },
    { label: 'Đơn hàng', path: '/admin/orders', icon: 'cart' },
    { label: 'Sản phẩm', path: '/admin/products', icon: 'box' },
    { label: 'Khuyến mãi & voucher', path: '/admin/promotions', icon: 'tag' },
    { label: 'Banner', path: '/admin/banners', icon: 'image' },
    { label: 'Thông báo', path: '/admin/notifications', icon: 'bell' },
    { label: 'Báo cáo', path: '/admin/reports', icon: 'chart' },
    { label: 'Nhật ký audit', path: '/admin/audit', icon: 'history' },
  ],
  SALES: [
    { label: 'Dashboard', path: '/sales', icon: 'dashboard' },
    { label: 'Bán tại quầy (POS)', path: '/sales/pos', icon: 'store' },
    { label: 'Đơn hàng', path: '/sales/orders', icon: 'cart' },
    { label: 'Khách hàng', path: '/sales/customers', icon: 'user' },
    { label: 'Thanh toán', path: '/sales/payments', icon: 'card' },
    { label: 'Đổi trả', path: '/sales/returns', icon: 'return' },
    { label: 'Sản phẩm', path: '/sales/products', icon: 'box' },
    { label: 'Báo cáo bán hàng', path: '/sales/reports', icon: 'chart' },
  ],
  WAREHOUSE: [
    { label: 'Dashboard', path: '/warehouse', icon: 'dashboard' },
    { label: 'Tồn kho', path: '/warehouse/inventory', icon: 'warehouse' },
    { label: 'Nhập kho', path: '/warehouse/receipts', icon: 'box' },
    { label: 'Kiểm kê', path: '/warehouse/stocktake', icon: 'clipboard' },
    { label: 'Thẻ kho', path: '/warehouse/stock-cards', icon: 'book' },
    { label: 'Hàng trả', path: '/warehouse/returns', icon: 'return' },
    { label: 'Báo cáo kho', path: '/warehouse/reports', icon: 'chart' },
  ],
};
