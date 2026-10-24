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
    { label: 'Tài khoản nhân viên', path: '/admin/employees', icon: 'users' },
    { label: 'Khách hàng', path: '/admin/customers', icon: 'user' },
    { label: 'Bán tại quầy', path: '/admin/pos', icon: 'store' },
    { label: 'Đơn hàng', path: '/admin/orders', icon: 'cart' },
    { label: 'Hóa đơn', path: '/admin/invoices', icon: 'card' },
    { label: 'Sản phẩm', path: '/admin/products', icon: 'box' },
    { label: 'Loại sản phẩm', path: '/admin/catalog', icon: 'layers' }, 
    { label: 'Đánh giá', path: '/admin/reviews', icon: 'star' },
    { label: 'Nhà cung cấp', path: '/admin/suppliers', icon: 'truck' },
    { label: 'Phiếu nhập kho', path: '/admin/receipts', icon: 'clipboard' },
    { label: 'Tồn kho', path: '/admin/inventory', icon: 'warehouse' },
    { label: 'Chương trình khuyến mãi', path: '/admin/promotions', icon: 'tag' },
    { label: 'Banner', path: '/admin/banners', icon: 'image' },
    { label: 'Thông báo', path: '/admin/notifications', icon: 'bell' },
    { label: 'Báo cáo', path: '/admin/reports', icon: 'chart' },
    { label: 'Nhật ký hệ thống', path: '/admin/audit', icon: 'history' },
  ],
  SALES: [
    { label: 'Dashboard', path: '/sales', icon: 'dashboard' },
    { label: 'Bán tại quầy', path: '/sales/pos', icon: 'store' },
    { label: 'Đơn hàng', path: '/sales/orders', icon: 'cart' },
    { label: 'Hóa đơn', path: '/sales/invoices', icon: 'card' },
    { label: 'Khách hàng', path: '/sales/customers', icon: 'user' },
    { label: 'Thanh toán', path: '/sales/payments', icon: 'card' },
    { label: 'Đổi trả', path: '/sales/returns', icon: 'return' },
    { label: 'Sản phẩm', path: '/sales/products', icon: 'box' },
    { label: 'Đánh giá', path: '/sales/reviews', icon: 'star' },
    { label: 'Báo cáo bán hàng', path: '/sales/reports', icon: 'chart' },
  ],
  WAREHOUSE: [
    { label: 'Dashboard', path: '/warehouse', icon: 'dashboard' },
    { label: 'Tồn kho', path: '/warehouse/inventory', icon: 'warehouse' },
    { label: 'Nhập kho', path: '/warehouse/receipts', icon: 'box' },
    { label: 'Nhà cung cấp', path: '/warehouse/suppliers', icon: 'truck' },
    { label: 'Kiểm kê', path: '/warehouse/stocktake', icon: 'clipboard' },
    { label: 'Thẻ kho', path: '/warehouse/stock-cards', icon: 'book' },
    { label: 'Hàng trả', path: '/warehouse/returns', icon: 'return' },
    { label: 'Báo cáo kho', path: '/warehouse/reports', icon: 'chart' },
  ],
};
