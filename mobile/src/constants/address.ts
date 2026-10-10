import type { AddressLabel } from '@/types/address';

export const ADDRESS_LABELS: { value: AddressLabel; text: string }[] = [
  { value: 'HOME', text: 'Nhà' },
  { value: 'OFFICE', text: 'Công ty' },
  { value: 'OTHER', text: 'Khác' },
];

export const labelText = (l: AddressLabel) => ADDRESS_LABELS.find((x) => x.value === l)?.text ?? l;
