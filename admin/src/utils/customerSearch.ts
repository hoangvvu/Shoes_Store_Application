import type { CustomerFilters } from '../types/customer';

export const EMPTY_FILTERS: CustomerFilters = { q: '', gender: '', hasAccount: '', ageGroup: '', spend: '', sort: 'newest' };

export const GENDER_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả giới tính' },
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
  { value: 'NONE', label: 'Chưa cung cấp' },
];

export const ACCOUNT_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả tài khoản' },
  { value: 'true', label: 'Có tài khoản' },
  { value: 'false', label: 'Khách tại quầy' },
];

/** Nhóm tuổi tính từ ngày sinh; khách chưa có ngày sinh không thuộc nhóm nào khi lọc tuổi. */
export const AGE_GROUPS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: '', label: 'Tất cả độ tuổi' },
  { value: 'u18', label: 'Dưới 18 tuổi', max: 17 },
  { value: '18-24', label: '18 – 24 tuổi', min: 18, max: 24 },
  { value: '25-34', label: '25 – 34 tuổi', min: 25, max: 34 },
  { value: '35-44', label: '35 – 44 tuổi', min: 35, max: 44 },
  { value: '45-54', label: '45 – 54 tuổi', min: 45, max: 54 },
  { value: '55+', label: 'Từ 55 tuổi', min: 55 },
];

/** Mức tổng tiền đã mua (đồng). */
export const SPEND_RANGES: { value: string; label: string; min?: number; max?: number }[] = [
  { value: '', label: 'Mọi mức mua hàng' },
  { value: 'none', label: 'Chưa mua hàng', max: 0 },
  { value: 'lt1', label: 'Dưới 1 triệu', min: 1, max: 999_999 },
  { value: '1-5', label: '1 – 5 triệu', min: 1_000_000, max: 5_000_000 },
  { value: '5-20', label: '5 – 20 triệu', min: 5_000_001, max: 20_000_000 },
  { value: 'gt20', label: 'Trên 20 triệu', min: 20_000_001 },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên A → Z' },
  { value: 'spent', label: 'Mua nhiều nhất' },
];

/** Chuyển bộ lọc đã áp dụng thành tham số API. */
export function toApiParams(f: CustomerFilters) {
  const age = AGE_GROUPS.find((g) => g.value === f.ageGroup);
  const spend = SPEND_RANGES.find((g) => g.value === f.spend);
  return {
    q: f.q.trim() || undefined,
    gender: f.gender || undefined,
    hasAccount: f.hasAccount || undefined,
    ageMin: age?.min,
    ageMax: age?.max,
    minPurchased: spend?.min,
    maxPurchased: spend?.max,
    sort: f.sort,
  };
}

export const hasActiveFilters = (f: CustomerFilters) =>
  !!(f.q.trim() || f.gender || f.hasAccount || f.ageGroup || f.spend || f.sort !== 'newest');
