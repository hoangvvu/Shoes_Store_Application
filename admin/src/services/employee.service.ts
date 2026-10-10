import api from './api';
import { ApiResponse, Employee, EmployeePerformance } from '../types';

export const employeeService = {
  getEmployees: (params?: { q?: string; page?: number; size?: number }): Promise<ApiResponse<Employee[]>> => {
    return api.get('/employees', { params });
  },

  getEmployeeById: (id: number): Promise<ApiResponse<Employee>> => {
    return api.get(`/employees/${id}`);
  },

  createEmployee: (data: {
    fullName: string;
    username: string;
    password: string;
    roleName: string;
    baseSalary?: number;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
  }): Promise<ApiResponse<Employee>> => {
    return api.post('/employees', data);
  },

  updateEmployee: (
    id: number,
    data: {
      fullName?: string;
      baseSalary?: number;
      phone?: string;
      address?: string;
      dateOfBirth?: string;
    }
  ): Promise<ApiResponse<Employee>> => {
    return api.put(`/employees/${id}`, data);
  },

  deleteEmployee: (id: number): Promise<ApiResponse<null>> => {
    return api.delete(`/employees/${id}`);
  },

  getEmployeePerformance: (
    id: number,
    params?: { from?: string; to?: string }
  ): Promise<ApiResponse<EmployeePerformance>> => {
    return api.get(`/employees/${id}/performance`, { params });
  },
};
