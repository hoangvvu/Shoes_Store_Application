export interface RecentOrderRow {
  invoiceId: number;
  invoiceDate: Date;
  channel: 'ONLINE' | 'POS';
  orderStatus: string;
  amountPayable: number;
}
