export interface Paged<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CustomerListItem {
  customerId: number;
  fullName: string;
  phone: string | null;
  totalPurchased: number;
  hasAccount: boolean;
}

export interface Address {
  addressId: number;
  label: 'HOME' | 'OFFICE' | 'OTHER';
  receiverName: string;
  receiverPhone: string;
  province: string;
  district: string;
  ward: string;
  streetDetail: string;
  isDefault: boolean;
}

export interface RecentOrder {
  invoiceId: number;
  invoiceDate: string;
  channel: 'ONLINE' | 'POS';
  orderStatus: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  amountPayable: number;
}

export interface CustomerDetail extends CustomerListItem {
  addresses: Address[];
  recentOrders: RecentOrder[];
}

export interface CustomerFormValues {
  fullName: string;
  phone: string;
}
