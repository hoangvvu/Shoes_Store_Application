import { InvoiceDetailView } from '../../components/invoices/InvoiceDetailView';

export default function SalesInvoiceDetailPage() {
  return <InvoiceDetailView basePath="/sales/invoices" ordersPath="/sales/orders" />;
}
