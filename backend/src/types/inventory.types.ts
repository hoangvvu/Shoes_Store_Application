export interface StockItemRow {
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

export interface LedgerEntryRow {
  transactionId: number;
  transactionType: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  createdAt: Date;
  purchaseReceiptId: number | null;
  invoiceId: number | null;
  returnId: number | null;
  createdByName: string | null;
}
