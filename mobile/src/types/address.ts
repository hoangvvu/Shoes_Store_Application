export type AddressLabel = 'HOME' | 'OFFICE' | 'OTHER';

export interface Address {
  addressId: number;
  label: AddressLabel;
  receiverName: string;
  receiverPhone: string;
  province: string;
  district: string;
  ward: string;
  streetDetail: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, 'addressId' | 'isDefault'>;
