import { InvoiceDetailView } from '../../components/invoices/InvoiceDetailView';

export default function AdminInvoiceDetailPage() {
  return <InvoiceDetailView basePath="/admin/invoices" ordersPath="/admin/orders" />;
}
