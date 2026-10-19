import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { favoriteRepository } from '../repositories/favorite.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { setActor } from '../utils/session';

function customerIdOf(auth: AuthUser): number {
  if (!auth.customerId) throw AppError.forbidden();
  return auth.customerId;
}

export const favoriteService = {
  /** Thích (idempotent): đã thích rồi vẫn trả thành công; từng bỏ thích thì khôi phục dòng cũ. */
  async like(auth: AuthUser, productId: number) {
    const customerId = customerIdOf(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      if (!(await favoriteRepository.productExists(productId, tx))) {
        throw AppError.notFound('Không tìm thấy sản phẩm', 'PRODUCT_NOT_FOUND');
      }
      await favoriteRepository.like(customerId, productId, tx);
    });
    return { productId, isFavorite: true };
  },

  /** Bỏ thích (idempotent): xóa mềm, bỏ thích sản phẩm chưa thích vẫn thành công. */
  async unlike(auth: AuthUser, productId: number) {
    const customerId = customerIdOf(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      await favoriteRepository.unlike(customerId, productId, tx);
    });
  },

  async list(auth: AuthUser, page: number, size: number) {
    const { rows, total } = await favoriteRepository.list(customerIdOf(auth), page, size);
    return toPaged(rows, total, page, size);
  },
};
