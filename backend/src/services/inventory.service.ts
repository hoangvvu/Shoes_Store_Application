import { AppError } from '../errors/AppError';
import { inventoryRepository } from '../repositories/inventory.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import type {
  AdjustStockInput,
  LedgerQuery,
  StockListQuery,
} from '../validators/inventory.validator';

const VARIANT_NOT_FOUND = () => AppError.notFound('Không tìm thấy biến thể sản phẩm', 'VARIANT_NOT_FOUND');

export const inventoryService = {
  async list(q: StockListQuery) {
    const { rows, total } = await inventoryRepository.listStock({
      q: q.q,
      lowStockOnly: q.lowStockOnly,
      threshold: q.threshold,
      page: q.page,
      size: q.size,
    });
    return toPaged(rows, total, q.page, q.size);
  },

  async lowStock(threshold = 5) {
    return inventoryRepository.listLowStock(threshold);
  },

  async ledger(variantId: number, q: LedgerQuery) {
    const variant = await inventoryRepository.findVariantStockItem(variantId);
    if (!variant) throw VARIANT_NOT_FOUND();

    // Ép kiểu chuỗi từ query sang Date (hoặc giữ nguyên nếu đã là Date)
    const fromDate = q.from ? new Date(q.from) : undefined;
    const toDate = q.to ? new Date(q.to) : undefined;

    const { rows, total } = await inventoryRepository.listLedger({
      variantId,
      from: fromDate,
      to: toDate,
      page: q.page,
      size: q.size,
    });

    const paged = toPaged(
      rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      q.page,
      q.size,
    );

    return {
      ...paged,
      variant,
    };
  },

  async adjust(actor: AuthUser, input: AdjustStockInput) {
    const variant = await inventoryRepository.findVariantStockItem(input.variantId);
    if (!variant) throw VARIANT_NOT_FOUND();

    try {
      await inventoryRepository.adjustStock(
        input.variantId,
        input.quantityChange,
        input.reason,
        actor.userId,
      );
    } catch (err: unknown) {
      const e = err as { number?: number; message?: string };
      if (e?.number === 51011 || (e?.message ?? '').includes('Không đủ tồn kho')) {
        throw AppError.conflict('Tồn kho hiện tại không đủ để giảm số lượng yêu cầu', 'INSUFFICIENT_STOCK');
      }
      throw err;
    }
  },
};