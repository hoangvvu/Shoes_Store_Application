import type { Gender } from '../validators/common';

export interface CustomerRow {
  customerId: number;
  lastName: string;
  firstName: string;
  /** Họ + Tên ghép sẵn bằng SQL, chỉ để hiển thị. */
  fullName: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  email: string | null;
  totalPurchased: number;
}

export interface CustomerListRow extends CustomerRow {
  hasAccount: boolean;
}

export interface CustomerFilter {
  q?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'NONE';
  hasAccount?: boolean;
  /** Ngày sinh phải <= giá trị này (đã tính từ tuổi tối thiểu). */
  bornOnOrBefore?: Date;
  /** Ngày sinh phải > giá trị này (đã tính từ tuổi tối đa). */
  bornAfter?: Date;
  minPurchased?: number;
  maxPurchased?: number;
  sort: 'newest' | 'name' | 'spent';
  page: number;
  size: number;
}
