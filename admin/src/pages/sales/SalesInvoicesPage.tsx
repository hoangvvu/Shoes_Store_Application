import { InvoiceManager } from '../../components/invoices/InvoiceManager';

/** Nhân viên bán hàng: chỉ xem danh sách hóa đơn (không có thống kê doanh thu). */
export default function SalesInvoicesPage() {
  return <InvoiceManager basePath="/sales/invoices" />;
}
