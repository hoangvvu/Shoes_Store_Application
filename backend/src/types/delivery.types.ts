import type { OrderStatus } from '../constants/order.constant';

export interface DeliveryOrderRow {
  invoiceId: number;
  invoiceDate: Date;
  channel: 'ONLINE' | 'POS';
  receiverName: string | null;
  receiverPhone: string | null;
  shippingAddress: string | null;
  totalAmount: number;
  discountAmount: number;
  amountPayable: number;
  orderStatus: OrderStatus;
}

export interface DeliveryLineRow {
  variantId: number;
  productName: string;
  sizeLabel: string;
  colorName: string;
  quantity: number;
  salePrice: number;
  lineTotal: number;
}
