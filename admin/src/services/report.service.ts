import type {
  DateRange,
  EmployeeSales,
  InventoryMovementRow,
  OrdersReport,
  ReportKey,
  ReturnRate,
  RevenuePoint,
  StockReport,
  TopCustomer,
  TopProduct,
} from '../types/report';
import { api } from './api';

/** M15 – Báo cáo. Backend lọc quyền: doanh thu tổng, lương, nhân sự chỉ ADMIN. */
export const reportService = {
  async revenue(r: DateRange & { groupBy: 'day' | 'month' }): Promise<RevenuePoint[]> {
    const { data } = await api.get<RevenuePoint[]>('/reports/revenue', { params: r });
    return data;
  },
  async topProducts(r: DateRange & { limit?: number; by?: 'quantity' | 'revenue' }): Promise<TopProduct[]> {
    const { data } = await api.get<TopProduct[]>('/reports/top-products', { params: r });
    return data;
  },
  async orders(r: DateRange): Promise<OrdersReport> {
    const { data } = await api.get<OrdersReport>('/reports/orders', { params: r });
    return data;
  },
  async stock(p: { threshold?: number; staleDays?: number }): Promise<StockReport> {
    const { data } = await api.get<StockReport>('/reports/stock', { params: p });
    return data;
  },
  async inventoryMovement(r: DateRange): Promise<InventoryMovementRow[]> {
    const { data } = await api.get<InventoryMovementRow[]>('/reports/inventory-movement', { params: r });
    return data;
  },
  async topCustomers(r: DateRange & { limit?: number }): Promise<TopCustomer[]> {
    const { data } = await api.get<TopCustomer[]>('/reports/top-customers', { params: r });
    return data;
  },
  async employees(r: DateRange): Promise<EmployeeSales[]> {
    const { data } = await api.get<EmployeeSales[]>('/reports/employees', { params: r });
    return data;
  },
  async returns(r: DateRange): Promise<ReturnRate[]> {
    const { data } = await api.get<ReturnRate[]>('/reports/returns', { params: r });
    return data;
  },
  /** M15 #9 – tải Excel qua axios để kèm token (không mở URL trần vì sẽ thiếu Authorization). */
  async exportExcel(key: ReportKey, params: Record<string, string | number | undefined>): Promise<void> {
    const { data } = await api.get<Blob>(`/reports/${key}`, { params: { ...params, format: 'xlsx' }, responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-${key}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
