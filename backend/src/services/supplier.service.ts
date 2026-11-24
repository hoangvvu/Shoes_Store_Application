import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { supplierRepository } from '../repositories/supplier.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { setActor } from '../utils/session';
import type {
  CreateSupplierInput,
  SupplierListQuery,
  UpdateSupplierInput,
} from '../validators/inventory.validator';

import { searchCache, SEARCH_TTL, invalidateAfter } from './cache.service';
const NOT_FOUND = () => AppError.notFound('Không tìm thấy nhà cung cấp', 'SUPPLIER_NOT_FOUND');

export const supplierService = {
  async list(q: SupplierListQuery) {
    const filter = { q: q.q, page: q.page, size: q.size };
    return searchCache.getOrLoad('suppliers', { fn: 'supplier.list', ...filter }, SEARCH_TTL.suppliers, async () => {
      const { rows, total } = await supplierRepository.list(filter);
      return toPaged(rows, total, q.page, q.size);
    });
  },

  async getDetail(id: number) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) throw NOT_FOUND();
    return supplier;
  },

  async create(actor: AuthUser, input: CreateSupplierInput) {
    return withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      return supplierRepository.insert(input, tx);
    });
  },

  async update(actor: AuthUser, id: number, input: UpdateSupplierInput) {
    const existing = await supplierRepository.findById(id);
    if (!existing) throw NOT_FOUND();

    return withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      return supplierRepository.update(id, input, tx);
    });
  },

  async remove(actor: AuthUser, id: number) {
    const existing = await supplierRepository.findById(id);
    if (!existing) throw NOT_FOUND();

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await supplierRepository.softDelete(id, tx);
    });
  },
};

// Sau khi ghi thành công thì invalidate cache tìm kiếm liên quan
invalidateAfter(supplierService, {
  create: ['suppliers'],
  update: ['suppliers'],
  remove: ['suppliers'],
});
