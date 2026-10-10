import { CustomerDetailView } from '../../components/customers/CustomerDetailView';

export default function AdminCustomerDetailPage() {
  return <CustomerDetailView basePath="/admin/customers" canDelete={true} />;
}
