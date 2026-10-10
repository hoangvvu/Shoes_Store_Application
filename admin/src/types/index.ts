// ================= M3: EMPLOYEE =================
export interface Employee {
  employeeId: number;
  fullName: string;
  dateOfBirth?: string | null;
  address?: string | null;
  phone?: string | null;
  baseSalary: number;
  userId?: number;
  username?: string;
  roleName?: string;
  isLocked?: boolean;
}

export interface EmployeePerformance {
  employeeId: number;
  fullName: string;
  totalDeliveredOrders: number;
  totalRevenue: number;
}

// ================= M4: CATALOG & PRODUCTS =================
export interface Category {
  categoryId: number;
  categoryName: string;
}

export interface Brand {
  brandId: number;
  brandName: string;
}

export interface Size {
  sizeId: number;
  sizeLabel: string;
  sortOrder: number;
}

export interface Color {
  colorId: number;
  colorName: string;
  hexCode?: string | null;
}

export interface ProductVariant {
  variantId: number;
  productId: number;
  sku: string;
  stockQuantity: number;
  sizeId: number;
  sizeLabel: string;
  colorId: number;
  colorName: string;
  hexCode?: string | null;
}

export interface Product {
  productId: number;
  productName: string;
  categoryId?: number;
  categoryName?: string;
  brandId?: number;
  brandName?: string;
  currentPrice: number;
  unit: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  totalStock?: number;
  variantCount?: number;
  avgRating?: number;
  reviewCount?: number;
  activeDiscountPercent?: number;
  finalPrice?: number;
  variants?: ProductVariant[];
}

// ================= M5: SUPPLIERS & RECEIPTS =================
export interface Supplier {
  supplierId: number;
  supplierName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface PurchaseReceiptDetail {
  receiptId: number;
  variantId: number;
  quantity: number;
  importPrice: number;
  lineTotal: number;
  sku: string;
  stockQuantity: number;
  sizeLabel: string;
  colorName: string;
  productId: number;
  productName: string;
  unit: string;
}

export interface PurchaseReceipt {
  receiptId: number;
  receiptDate: string;
  totalAmount: number;
  supplierId: number;
  supplierName: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierAddress?: string;
  employeeId: number;
  employeeName: string;
  itemCount?: number;
  totalQuantity?: number;
  details?: PurchaseReceiptDetail[];
}

// ================= M6: INVENTORY =================
export interface StockItem {
  variantId: number;
  productId: number;
  sku: string;
  stockQuantity: number;
  productName: string;
  currentPrice: number;
  unit: string;
  imageUrl?: string | null;
  isActive: boolean;
  categoryName?: string;
  brandName?: string;
  sizeLabel: string;
  colorName: string;
  hexCode?: string | null;
}

export interface LedgerEntry {
  transactionId: number;
  variantId: number;
  transactionType: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason?: string | null;
  createdAt: string;
  purchaseReceiptId?: number | null;
  invoiceId?: number | null;
  returnId?: number | null;
  userId?: number | null;
  username?: string | null;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
}

export interface InventoryMovement {
  variantId: number;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
  tonDau: number;
  nhap: number;
  xuat: number;
  tonCuoi: number;
}

// ================= M15: REPORTS =================
export interface RevenueItem {
  period: string;
  totalOrders: number;
  grossTotal: number;
  totalDiscount: number;
  grossRevenue: number;
  totalRefunded: number;
  netRevenue: number;
}

export interface TopProductItem {
  productId: number;
  productName: string;
  imageUrl?: string;
  categoryName?: string;
  brandName?: string;
  currentPrice: number;
  totalSoldQuantity: number;
  totalSalesAmount: number;
}

export interface OrderSummary {
  byStatus: Array<{ orderStatus: string; count: number; totalAmount: number }>;
  overduePendingCount: number;
}

export interface TopCustomerItem {
  customerId: number;
  fullName: string;
  phone?: string;
  totalPurchased: number;
  totalDeliveredOrders: number;
}

export interface EmployeeSalesItem {
  employeeId: number;
  fullName: string;
  phone?: string;
  baseSalary: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface ReturnRateItem {
  productId: number;
  productName: string;
  totalSold: number;
  totalReturned: number;
  returnRatePercent: number;
}

// Generic API response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
  code?: string;
  details?: any;
}
