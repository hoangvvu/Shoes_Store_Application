import type { Paged } from '../types/customer';
import type {
  AdjustStockValues,
  LedgerEntry,
  ReceiptCreateValues,
  ReceiptDetail,
  ReceiptListItem,
  ReceiptListParams,
  StockItem,
  StockListParams,
  Supplier,
  SupplierFormValues,
} from '../types/inventory';
import { api } from './api';

const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false)) as Partial<T>;

/** M5 #1 – Nhà cung cấp. */
export const supplierService = {
  async list(p: { q?: string; page: number; size: number }): Promise<Paged<Supplier>> {
    const { data } = await api.get<Paged<Supplier>>('/suppliers', { params: clean(p) });
    return data;
  },
  async create(v: SupplierFormValues): Promise<Supplier> {
    const { data } = await api.post<Supplier>('/suppliers', v);
    return data;
  },
  async update(id: number, v: SupplierFormValues): Promise<Supplier> {
    const { data } = await api.put<Supplier>(`/suppliers/${id}`, v);
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/suppliers/${id}`);
  },
};

/** M5 #2–5 – Phiếu nhập. Trigger tự ghi sổ kho IMPORT và tính tổng tiền; client không gửi tổng. */
export const receiptService = {
  async list(p: ReceiptListParams): Promise<Paged<ReceiptListItem>> {
    const { data } = await api.get<Paged<ReceiptListItem>>('/purchase-receipts', { params: clean(p) });
    return data;
  },
  async get(id: number): Promise<ReceiptDetail> {
    const { data } = await api.get<ReceiptDetail>(`/purchase-receipts/${id}`);
    return data;
  },
  async create(v: ReceiptCreateValues): Promise<ReceiptDetail> {
    const { data } = await api.post<ReceiptDetail>('/purchase-receipts', v);
    return data;
  },
  /** Xóa mềm = hoàn tác nhập kho bằng IMPORT_REVERSAL; bắt buộc lý do (chỉ ADMIN). */
  async remove(id: number, reason: string): Promise<void> {
    await api.delete(`/purchase-receipts/${id}`, { data: { reason } });
  },
};

/** M6 – Tồn kho, thẻ kho, điều chỉnh qua sp_adjust_stock. Không bao giờ sửa stock_quantity trực tiếp. */
export const inventoryService = {
  async list(p: StockListParams): Promise<Paged<StockItem>> {
    const { data } = await api.get<Paged<StockItem>>('/inventory', { params: clean(p) });
    return data;
  },
  async lowStock(threshold?: number): Promise<StockItem[]> {
    const { data } = await api.get<StockItem[]>('/inventory/low-stock', { params: { threshold } });
    return data;
  },
  async ledger(variantId: number, p: { from?: string; to?: string; page: number; size: number }): Promise<Paged<LedgerEntry> & { variant?: StockItem }> {
    const { data } = await api.get<Paged<LedgerEntry> & { variant?: StockItem }>(`/inventory/${variantId}/ledger`, { params: clean(p) });
    return data;
  },
  async adjust(v: AdjustStockValues): Promise<void> {
    await api.post('/inventory/adjust', v);
  },
};
