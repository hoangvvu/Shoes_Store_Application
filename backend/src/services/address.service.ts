import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { addressRepository } from '../repositories/address.repository';
import type { AuthUser } from '../types/express';
import { normalizePhone } from '../utils/phone';
import { setActor } from '../utils/session';
import type { CreateAddressInput, UpdateAddressInput } from '../validators/address.validator';

const NOT_FOUND = () => AppError.notFound('Địa chỉ không tồn tại', 'ADDRESS_NOT_FOUND');

/** customerId luôn lấy từ token, không nhận từ body/URL (chống IDOR). */
function customerIdOf(auth: AuthUser): number {
  if (!auth.customerId) throw AppError.forbidden();
  return auth.customerId;
}

export const addressService = {
  list(auth: AuthUser) {
    return addressRepository.listByCustomer(customerIdOf(auth));
  },

  async create(auth: AuthUser, input: CreateAddressInput) {
    const customerId = customerIdOf(auth);
    const id = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const isFirst = (await addressRepository.countActive(customerId, tx)) === 0; // địa chỉ đầu tiên tự mặc định
      return addressRepository.insert(
        customerId,
        { ...input, receiverPhone: normalizePhone(input.receiverPhone) },
        isFirst,
        tx,
      );
    });
    return (await addressRepository.findOwned(id, customerId))!;
  },

  async update(auth: AuthUser, addressId: number, input: UpdateAddressInput) {
    const customerId = customerIdOf(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      if (!(await addressRepository.findOwned(addressId, customerId, tx))) throw NOT_FOUND();
      await addressRepository.update(
        addressId,
        customerId,
        { ...input, receiverPhone: input.receiverPhone ? normalizePhone(input.receiverPhone) : undefined },
        tx,
      );
    });
    return (await addressRepository.findOwned(addressId, customerId))!;
  },

  /** Xóa mềm; nếu xóa địa chỉ mặc định thì chọn địa chỉ mới nhất còn lại làm mặc định. */
  async remove(auth: AuthUser, addressId: number) {
    const customerId = customerIdOf(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const addr = await addressRepository.findOwned(addressId, customerId, tx);
      if (!addr) throw NOT_FOUND();
      await addressRepository.softDelete(addressId, customerId, tx);
      if (addr.isDefault) {
        const next = await addressRepository.findLatestActive(customerId, tx);
        if (next) await addressRepository.setDefault(next.addressId, customerId, tx);
      }
    });
  },

  /** Một transaction: bỏ cờ mặc định cũ rồi đặt cờ mới; không có địa chỉ hợp lệ thì rollback. */
  async setDefault(auth: AuthUser, addressId: number) {
    const customerId = customerIdOf(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      await addressRepository.clearDefault(customerId, tx);
      if ((await addressRepository.setDefault(addressId, customerId, tx)) === 0) throw NOT_FOUND();
    });
    return (await addressRepository.findOwned(addressId, customerId))!;
  },
};
