export interface Paged<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface CustomerListItem {
  customerId: number;
  /** Họ (kèm tên đệm). */
  lastName: string;
  /** Tên. */
  firstName: string;
  /** Họ + Tên do backend ghép sẵn, chỉ để hiển thị. */
  fullName: string;
  phone: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth: string | null;
  email: string | null;
  totalPurchased: number;
  hasAccount: boolean;
}

/** Bộ lọc tìm kiếm nâng cao (mọi trường đều không bắt buộc, kết hợp bằng AND). */
export interface CustomerFilters {
  q: string;
  gender: '' | 'MALE' | 'FEMALE' | 'OTHER' | 'NONE';
  hasAccount: '' | 'true' | 'false';
  /** Nhóm tuổi: khóa trong AGE_GROUPS. */
  ageGroup: string;
  /** Mức mua: khóa trong SPEND_RANGES. */
  spend: string;
  sort: 'newest' | 'name' | 'spent';
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
  lastName: string;
  firstName: string;
  phone: string;
  /** null = xóa giá trị (không bắt buộc); bỏ qua = giữ nguyên. */
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  email?: string | null;
}
