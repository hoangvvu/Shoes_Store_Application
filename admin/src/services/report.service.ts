import api from './api';
import {
  ApiResponse,
  RevenueItem,
  TopProductItem,
  OrderSummary,
  TopCustomerItem,
  EmployeeSalesItem,
  ReturnRateItem,
  InventoryMovement,
} from '../types';

export const reportService = {
  getRevenue: (params?: { from?: string; to?: string; groupBy?: 'day' | 'month' }): Promise<ApiResponse<RevenueItem[]>> => {
    return api.get('/reports/revenue', { params });
  },

  getTopProducts: (params?: { from?: string; to?: string; limit?: number }): Promise<ApiResponse<TopProductItem[]>> => {
    return api.get('/reports/top-products', { params });
  },

  getOrdersSummary: (params?: { from?: string; to?: string }): Promise<ApiResponse<OrderSummary>> => {
    return api.get('/reports/orders', { params });
  },

  getStockAlerts: (params?: { threshold?: number; staleDays?: number }): Promise<ApiResponse<{ lowStock: any[]; staleStock: any[] }>> => {
    return api.get('/reports/stock', { params });
  },

  getInventoryMovement: (params?: { from?: string; to?: string }): Promise<ApiResponse<InventoryMovement[]>> => {
    return api.get('/reports/inventory-movement', { params });
  },

  getTopCustomers: (params?: { limit?: number }): Promise<ApiResponse<TopCustomerItem[]>> => {
    return api.get('/reports/top-customers', { params });
  },

  getEmployeeSales: (params?: { from?: string; to?: string }): Promise<ApiResponse<EmployeeSalesItem[]>> => {
    return api.get('/reports/employees', { params });
  },

  getReturnRates: (params?: { from?: string; to?: string }): Promise<ApiResponse<ReturnRateItem[]>> => {
    return api.get('/reports/returns', { params });
  },

  /**
   * Helper to download Excel file
   */
  exportExcelUrl: (reportType: string, params?: Record<string, string | number>): string => {
    const searchParams = new URLSearchParams({ format: 'xlsx' });
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val));
        }
      });
    }
    const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api/v1';
    return `${baseUrl}/reports/${reportType}?${searchParams.toString()}`;
  },
};
