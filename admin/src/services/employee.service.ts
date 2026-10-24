import type { EmployeeRole } from '../types/auth';
import type { Paged } from '../types/customer';
import type {
  EmployeeCreateValues,
  EmployeeDetail,
  EmployeeListItem,
  EmployeePerformance,
  EmployeeUpdateValues,
} from '../types/employee';
import { api } from './api';

/** M3 – Quản lý nhân viên (chỉ ADMIN). Khóa/đổi vai trò dùng API tài khoản /users của M1. */
export const employeeService = {
  async list(p: { q?: string; role?: EmployeeRole | ''; page: number; size: number }): Promise<Paged<EmployeeListItem>> {
    const { data } = await api.get<Paged<EmployeeListItem>>('/employees', {
      params: { ...p, q: p.q || undefined, role: p.role || undefined },
    });
    return data;
  },
  async get(id: number): Promise<EmployeeDetail> {
    const { data } = await api.get<EmployeeDetail>(`/employees/${id}`);
    return data;
  },
  /** Tạo hồ sơ + tài khoản trong 1 transaction (M3 #3). */
  async create(v: EmployeeCreateValues): Promise<EmployeeDetail> {
    const { data } = await api.post<EmployeeDetail>('/employees', v);
    return data;
  },
  async update(id: number, v: EmployeeUpdateValues): Promise<EmployeeDetail> {
    const { data } = await api.put<EmployeeDetail>(`/employees/${id}`, v);
    return data;
  },
  /** Xóa mềm hồ sơ và tài khoản; backend chặn nếu còn đơn đang xử lý (M3 #5). */
  async remove(id: number): Promise<void> {
    await api.delete(`/employees/${id}`);
  },
  async performance(id: number, range: { from: string; to: string }): Promise<EmployeePerformance> {
    const { data } = await api.get<EmployeePerformance>(`/employees/${id}/performance`, { params: range });
    return data;
  },
  async setLocked(userId: number, isLocked: boolean): Promise<void> {
    await api.patch(`/users/${userId}/lock`, { isLocked });
  },
  async changeRole(userId: number, role: EmployeeRole): Promise<void> {
    await api.patch(`/users/${userId}/role`, { role });
  },
};
