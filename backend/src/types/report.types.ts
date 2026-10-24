export interface RevenuePointRow {
  period: string;
  orders: number;
  grossRevenue: number;
  refunded: number;
  netRevenue: number;
}

export interface TopProductRow {
  productId: number;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  revenue: number;
}

export interface OrdersReportRow {
  byStatus: { status: string; count: number }[];
  overduePending: number;
}

export interface StockAlertRow {
  variantId: number;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
  stockQuantity: number;
  lastMovementAt: Date | null;
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

export interface TopCustomerRow {
  customerId: number;
  fullName: string;
  phone: string | null;
  orders: number;
  totalPurchased: number;
}

export interface EmployeeSalesRow {
  employeeId: number;
  fullName: string;
  orders: number;
  revenue: number;
}

export interface ReturnRateRow {
  productId: number;
  productName: string;
  soldQuantity: number;
  returnedQuantity: number;
  returnedValue: number;
  ratePercent: number;
}
