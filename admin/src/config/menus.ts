import type { EmployeeRole } from '../types/auth';

export interface MenuItem {
  label: string;
  path: string;
}

/** Menu theo ma trận phân quyền (docx mục 3). Ẩn menu chỉ để gọn UI; backend mới là nơi chặn quyền. */
export const MENUS: Record<EmployeeRole, MenuItem[]> = {
  ADMIN: [
    { label: 'Tổng quan', path: '/admin' },
    { label: 'Nhân viên & tài khoản', path: '/admin/employees' },
    { label: 'Khách hàng', path: '/admin/customers' },
    { label: 'Sản phẩm', path: '/admin/products' },
    { label: 'Khuyến mãi & voucher', path: '/admin/promotions' },
    { label: 'Banner', path: '/admin/banners' },
    { label: 'Thông báo', path: '/admin/notifications' },
    { label: 'Báo cáo', path: '/admin/reports' },
    { label: 'Nhật ký audit', path: '/admin/audit' },
  ],
  SALES: [
    { label: 'Tổng quan', path: '/sales' },
    { label: 'Bán tại quầy (POS)', path: '/sales/pos' },
    { label: 'Đơn hàng', path: '/sales/orders' },
    { label: 'Khách hàng', path: '/sales/customers' },
    { label: 'Thanh toán', path: '/sales/payments' },
    { label: 'Đổi trả', path: '/sales/returns' },
    { label: 'Sản phẩm', path: '/sales/products' },
    { label: 'Báo cáo bán hàng', path: '/sales/reports' },
  ],
  WAREHOUSE: [
    { label: 'Tổng quan', path: '/warehouse' },
    { label: 'Tồn kho', path: '/warehouse/inventory' },
    { label: 'Nhập kho', path: '/warehouse/receipts' },
    { label: 'Kiểm kê', path: '/warehouse/stocktake' },
    { label: 'Thẻ kho', path: '/warehouse/stock-cards' },
    { label: 'Hàng trả', path: '/warehouse/returns' },
    { label: 'Báo cáo kho', path: '/warehouse/reports' },
  ],
};
