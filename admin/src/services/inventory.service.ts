import api from './api';
import { ApiResponse, StockItem, LedgerEntry, InventoryMovement } from '../types';

export const inventoryService = {
  getStockList: (params?: {
    q?: string;
    categoryId?: number;
    brandId?: number;
    threshold?: number;
    lowStockOnly?: boolean;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<StockItem[]>> => {
    return api.get('/inventory', { params });
  },

  getLowStock: (threshold?: number): Promise<ApiResponse<StockItem[]>> => {
    return api.get('/inventory/low-stock', { params: { threshold } });
  },

  getVariantLedger: (
    variantId: number,
    params?: { from?: string; to?: string; page?: number; size?: number }
  ): Promise<ApiResponse<LedgerEntry[]>> => {
    return api.get(`/inventory/${variantId}/ledger`, { params });
  },

  adjustStock: (data: {
    variantId: number;
    quantityChange: number;
    reason: string;
  }): Promise<ApiResponse<StockItem>> => {
    return api.post('/inventory/adjust', data);
  },

  getMovementReport: (params?: { from?: string; to?: string }): Promise<ApiResponse<InventoryMovement[]>> => {
    return api.get('/inventory/movement-report', { params });
  },
};
