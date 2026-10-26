import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '../constants/auth.constant';
import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { employeeRepository } from '../repositories/employee.repository';
import { userRepository } from '../repositories/user.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { normalizePhone } from '../utils/phone';
import { setActor } from '../utils/session';
import type {
  CreateEmployeeInput,
  EmployeeListQuery,
  EmployeePerformanceQuery,
  UpdateEmployeeInput,
} from '../validators/employee.validator';

const NOT_FOUND = () => AppError.notFound('Không tìm thấy nhân viên', 'EMPLOYEE_NOT_FOUND');
const PHONE_TAKEN = () => AppError.conflict('Số điện thoại đã được đăng ký cho nhân viên khác', 'PHONE_TAKEN');
const USERNAME_TAKEN = () => AppError.conflict('Tên đăng nhập đã tồn tại', 'USERNAME_TAKEN');

export const employeeService = {
  async list(q: EmployeeListQuery) {
    const { rows, total } = await employeeRepository.list({
      q: q.q,
      role: q.role,
      employmentType: q.employmentType,
      page: q.page,
      size: q.size,
    });
    return toPaged(
      rows.map((r) => ({
        ...r,
        baseSalary: Number(r.baseSalary),
        hourlyRate: Number(r.hourlyRate),
        commissionRate: Number(r.commissionRate),
        allowance: Number(r.allowance),
        isLocked: Boolean(r.isLocked),
      })),
      total,
      q.page,
      q.size,
    );
  },

  async getDetail(employeeId: number) {
    const row = await employeeRepository.findDetailById(employeeId);
    if (!row) throw NOT_FOUND();
    const toIsoDate = (d: unknown) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return String(d).slice(0, 10);
    };
    const toIsoString = (d: unknown) => {
      if (!d) return null;
      if (d instanceof Date) return d.toISOString();
      return new Date(d as string | number).toISOString();
    };
    return {
      ...row,
      baseSalary: Number(row.baseSalary),
      hourlyRate: Number(row.hourlyRate),
      commissionRate: Number(row.commissionRate),
      allowance: Number(row.allowance),
      isLocked: Boolean(row.isLocked),
      dateOfBirth: toIsoDate(row.dateOfBirth),
      createdAt: toIsoString(row.createdAt),
    };
  },

  async create(actor: AuthUser, input: CreateEmployeeInput) {
    const phone = input.phone ? normalizePhone(input.phone) : undefined;

    if (phone && (await employeeRepository.phoneExists(phone, null))) {
      throw PHONE_TAKEN();
    }
    if (await userRepository.usernameExists(input.username)) {
      throw USERNAME_TAKEN();
    }

    const roleRow = await userRepository.findRoleByName(input.role);
    if (!roleRow) {
      throw AppError.badRequest(`Không tìm thấy vai trò ${input.role}`);
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

    const employeeId = await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);

      const empId = await employeeRepository.insert(
        {
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          address: input.address,
          phone,
          baseSalary: input.baseSalary ?? 0,
          employmentType: input.employmentType ?? 'FULL_TIME',
          hourlyRate: input.hourlyRate ?? 0,
          commissionRate: input.commissionRate ?? 0.0100,
          allowance: input.allowance ?? 0,
        },
        tx,
      );

      await userRepository.insert(
        {
          username: input.username,
          passwordHash,
          roleId: roleRow.roleId,
          userType: 'EMPLOYEE',
          employeeId: empId,
        },
        tx,
      );

      return empId;
    });

    return this.getDetail(employeeId);
  },

  async update(actor: AuthUser, employeeId: number, input: UpdateEmployeeInput) {
    const emp = await employeeRepository.findById(employeeId);
    if (!emp) throw NOT_FOUND();

    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    if (phone && (await employeeRepository.phoneExists(phone, employeeId))) {
      throw PHONE_TAKEN();
    }

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await employeeRepository.update(
        employeeId,
        {
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          address: input.address,
          phone,
          baseSalary: input.baseSalary,
          employmentType: input.employmentType,
          hourlyRate: input.hourlyRate,
          commissionRate: input.commissionRate,
          allowance: input.allowance,
        },
        tx,
      );
    });

    return this.getDetail(employeeId);
  },

  async remove(actor: AuthUser, employeeId: number) {
    const emp = await employeeRepository.findById(employeeId);
    if (!emp) throw NOT_FOUND();

    if (await employeeRepository.hasActiveOrders(employeeId)) {
      throw AppError.conflict('Nhân viên còn đơn đang xử lý, hãy bàn giao trước', 'EMPLOYEE_HAS_ACTIVE_ORDERS');
    }

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await employeeRepository.softDelete(employeeId, tx);
      await userRepository.softDeleteByEmployeeId(employeeId, tx);
    });
  },

  async performance(employeeId: number, range: EmployeePerformanceQuery) {
    const emp = await employeeRepository.findById(employeeId);
    if (!emp) throw NOT_FOUND();

    const toDate = new Date(`${range.to}T23:59:59.999Z`);
    const fromDate = new Date(`${range.from}T00:00:00.000Z`);

    const stats = await employeeRepository.getPerformance(
      employeeId,
      fromDate.toISOString(),
      toDate.toISOString(),
    );

    return {
      employeeId,
      fullName: emp.fullName,
      ...stats,
    };
  },
};
