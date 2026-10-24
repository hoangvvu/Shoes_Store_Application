export interface ReceiptListItemRow {
  receiptId: number;
  receiptDate: Date;
  totalAmount: number;
  supplierId: number;
  supplierName: string;
  employeeId: number;
  employeeName: string;
  itemCount: number;
  totalQuantity: number;
  isDeleted: boolean;
}

export interface ReceiptDetailRow extends ReceiptListItemRow {
  supplierPhone: string | null;
  supplierEmail: string | null;
  supplierAddress: string | null;
}

export interface ReceiptLineRow {
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
