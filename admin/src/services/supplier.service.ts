import api from './api';
import { ApiResponse, Supplier, PurchaseReceipt } from '../types';

export const supplierService = {
  // Suppliers
  getSuppliers: (params?: { q?: string; page?: number; size?: number }): Promise<ApiResponse<Supplier[]>> => {
    return api.get('/suppliers', { params });
  },

  getSupplierById: (id: number): Promise<ApiResponse<Supplier>> => {
    return api.get(`/suppliers/${id}`);
  },

  createSupplier: (data: {
    supplierName: string;
    phone?: string;
    email?: string;
    address?: string;
  }): Promise<ApiResponse<Supplier>> => {
    return api.post('/suppliers', data);
  },

  updateSupplier: (
    id: number,
    data: {
      supplierName?: string;
      phone?: string;
      email?: string;
      address?: string;
    }
  ): Promise<ApiResponse<Supplier>> => {
    return api.put(`/suppliers/${id}`, data);
  },

  deleteSupplier: (id: number): Promise<ApiResponse<null>> => {
    return api.delete(`/suppliers/${id}`);
  },

  // Purchase Receipts
  getPurchaseReceipts: (params?: {
    supplierId?: number;
    employeeId?: number;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }): Promise<ApiResponse<PurchaseReceipt[]>> => {
    return api.get('/purchase-receipts', { params });
  },

  getPurchaseReceiptById: (id: number): Promise<ApiResponse<PurchaseReceipt>> => {
    return api.get(`/purchase-receipts/${id}`);
  },

  createPurchaseReceipt: (data: {
    supplierId: number;
    employeeId?: number;
    items: Array<{ variantId: number; quantity: number; importPrice: number }>;
  }): Promise<ApiResponse<PurchaseReceipt>> => {
    return api.post('/purchase-receipts', data);
  },

  deletePurchaseReceipt: (id: number): Promise<ApiResponse<null>> => {
    return api.delete(`/purchase-receipts/${id}`);
  },
};
