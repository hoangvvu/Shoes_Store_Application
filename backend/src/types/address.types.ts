export interface AddressRow {
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
