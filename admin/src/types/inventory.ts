/** M5 – Nhà cung cấp và phiếu nhập. */
export interface Supplier {
  supplierId: number;
  supplierName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface SupplierFormValues {
  supplierName: string;
  phone: string;
  email: string;
  address: string;
}

export interface ReceiptListItem {
  receiptId: number;
  receiptDate: string;
  totalAmount: number;
  supplierId: number;
  supplierName: string;
  employeeId: number;
  employeeName: string;
  itemCount: number;
  totalQuantity: number;
  isDeleted?: boolean;
}

export interface ReceiptLine {
  variantId: number;
  sku: string;
  productName: string;
  sizeLabel: string;
  colorName: string;
  unit: string;
  quantity: number;
  importPrice: number;
  lineTotal: number;
}

export interface ReceiptDetail extends ReceiptListItem {
  supplierPhone: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
  lines: ReceiptLine[];
}

export interface ReceiptListParams {
  from?: string;
  to?: string;
  supplierId?: number;
  status?: 'ALL' | 'ACTIVE' | 'DELETED';
  page: number;
  size: number;
}

export interface ReceiptCreateValues {
  supplierId: number;
  lines: { variantId: number; quantity: number; importPrice: number }[];
}

/** M6 – Tồn kho và sổ kho (inventory_transactions). */
export interface StockItem {
  variantId: number;
  productId: number;
  sku: string;
  stockQuantity: number;
  productName: string;
  imageUrl: string | null;
  isActive: boolean;
  categoryName: string | null;
  brandName: string | null;
  sizeLabel: string;
  colorName: string;
  hexCode: string | null;
}

export interface StockListParams {
  q?: string;
  lowStockOnly?: boolean;
  threshold?: number;
  page: number;
  size: number;
}

export type TransactionType =
  | 'IMPORT'
  | 'IMPORT_REVERSAL'
  | 'SALE'
  | 'SALE_CANCEL'
  | 'RETURN_RESTOCK'
  | 'ADJUST_IN'
  | 'ADJUST_OUT';

export interface LedgerEntry {
  transactionId: number;
  transactionType: TransactionType;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: string;
  purchaseReceiptId: number | null;
  invoiceId: number | null;
  returnId: number | null;
  createdByName: string | null;
}

export interface AdjustStockValues {
  variantId: number;
  /** > 0 tăng kho (ADJUST_IN), < 0 giảm kho (ADJUST_OUT). */
  quantityChange: number;
  reason: string;
}
