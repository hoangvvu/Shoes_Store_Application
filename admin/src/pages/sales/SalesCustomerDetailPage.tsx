import { CustomerDetailView } from '../../components/customers/CustomerDetailView';

export default function SalesCustomerDetailPage() {
  return <CustomerDetailView basePath="/sales/customers" canDelete={false} />;
}
