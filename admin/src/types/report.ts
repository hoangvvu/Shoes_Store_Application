import type { OrderStatus } from './order';

/** M15 – Báo cáo và dashboard. Mọi báo cáo nhận khoảng ngày [from, to] dạng YYYY-MM-DD (giờ VN). */
export interface DateRange {
  from: string;
  to: string;
}

export interface RevenuePoint {
  period: string;
  orders: number;
  grossRevenue: number;
  refunded: number;
  netRevenue: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  revenue: number;
}

export interface OrdersReport {
  byStatus: { status: OrderStatus; count: number }[];
  overduePending: number;
}

export interface StockAlert {
  variantId: number;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
  stockQuantity: number;
  lastMovementAt: string | null;
}

export interface StockReport {
  lowStock: StockAlert[];
  staleStock: StockAlert[];
}

export interface InventoryMovementRow {
  variantId: number;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
  openingStock: number;
  imported: number;
  exported: number;
  closingStock: number;
}

export interface TopCustomer {
  customerId: number;
  fullName: string;
  phone: string | null;
  orders: number;
  totalPurchased: number;
}

export interface EmployeeSales {
  employeeId: number;
  fullName: string;
  orders: number;
  revenue: number;
}

export interface ReturnRate {
  productId: number;
  productName: string;
  soldQuantity: number;
  returnedQuantity: number;
  returnedValue: number;
  ratePercent: number;
}

export type ReportKey =
  | 'revenue'
  | 'top-products'
  | 'orders'
  | 'stock'
  | 'inventory-movement'
  | 'top-customers'
  | 'employees'
  | 'returns';
