import { ROLES } from '../constants/auth.constant';
import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { addressRepository } from '../repositories/address.repository';
import { customerRepository } from '../repositories/customer.repository';
import { invoiceRepository } from '../repositories/invoice.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthUser } from '../types/express';
import { yearsAgo } from '../utils/age';
import { toPaged } from '../utils/pagination';
import { normalizePhone } from '../utils/phone';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { CreateCustomerInput, CustomerListQuery, UpdateCustomerInput } from '../validators/customer.validator';

const PHONE_TAKEN = () => AppError.conflict('Số điện thoại đã được đăng ký', 'PHONE_TAKEN');
const NOT_FOUND = () => AppError.notFound('Không tìm thấy khách hàng', 'CUSTOMER_NOT_FOUND');

export const customerService = {
  /** Tìm kiếm nâng cao: đổi tuổi → khoảng ngày sinh (khách chưa có ngày sinh bị loại khi lọc tuổi). */
  async list(q: CustomerListQuery) {
    const { rows, total } = await customerRepository.list({
      q: q.q || undefined,
      gender: q.gender,
      hasAccount: q.hasAccount,
      bornOnOrBefore: q.ageMin !== undefined ? yearsAgo(q.ageMin) : undefined,
      bornAfter: q.ageMax !== undefined ? yearsAgo(q.ageMax + 1) : undefined,
      minPurchased: q.minPurchased,
      maxPurchased: q.maxPurchased,
      sort: q.sort,
      page: q.page,
      size: q.size,
    });
    return toPaged(rows, total, q.page, q.size);
  },

  async getDetail(customerId: number) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) throw NOT_FOUND();
    const [hasAccount, addresses, recentOrders] = await Promise.all([
      customerRepository.hasAccount(customerId),
      addressRepository.listByCustomer(customerId),
      invoiceRepository.findRecentByCustomer(customerId, 5),
    ]);
    return { ...customer, hasAccount, addresses, recentOrders };
  },

  /** Thêm khách tại quầy: chỉ tạo customers, không có tài khoản. */
  async create(actor: AuthUser, input: CreateCustomerInput) {
    const phone = normalizePhone(input.phone);
    try {
      const id = await withTransaction(async (tx) => {
        await setActor(tx, actor.userId);
        if (await customerRepository.phoneExists(phone, null, tx)) throw PHONE_TAKEN();
        return customerRepository.insert(
          { fullName: input.fullName, phone, gender: input.gender, dateOfBirth: input.dateOfBirth, email: input.email },
          tx,
        );
      });
      return this.getDetail(id);
    } catch (err) {
      if (isDuplicateKey(err, 'uq_customers_phone')) throw PHONE_TAKEN();
      throw err;
    }
  },

  /** Khách chỉ sửa hồ sơ của chính mình; NV/Admin sửa được mọi khách. */
  async update(actor: AuthUser, customerId: number, input: UpdateCustomerInput) {
    if (actor.role === ROLES.CUSTOMER && actor.customerId !== customerId) throw AppError.forbidden();
    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    try {
      await withTransaction(async (tx) => {
        await setActor(tx, actor.userId);
        if (!(await customerRepository.findById(customerId, tx))) throw NOT_FOUND();
        if (phone && (await customerRepository.phoneExists(phone, customerId, tx))) throw PHONE_TAKEN();
        await customerRepository.update(
          customerId,
          { fullName: input.fullName, phone, gender: input.gender, dateOfBirth: input.dateOfBirth, email: input.email },
          tx,
        );
      });
    } catch (err) {
      if (isDuplicateKey(err, 'uq_customers_phone')) throw PHONE_TAKEN();
      throw err;
    }
    return this.getDetail(customerId);
  },

  /** Xóa mềm khách + tài khoản liên kết; lịch sử đơn giữ nguyên. Chỉ Admin. */
  async remove(actor: AuthUser, customerId: number) {
    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      if (!(await customerRepository.findById(customerId, tx))) throw NOT_FOUND();
      if (await invoiceRepository.hasActiveByCustomer(customerId, tx)) {
        throw AppError.conflict('Khách còn đơn đang xử lý, hãy hoàn tất hoặc hủy đơn trước', 'CUSTOMER_HAS_ACTIVE_ORDERS');
      }
      await customerRepository.softDelete(customerId, tx);
      await userRepository.softDeleteByCustomerId(customerId, tx);
    });
  },
};
