import { CustomerManager } from '../../components/customers/CustomerManager';

export default function AdminCustomersPage() {
  return <CustomerManager basePath="/admin/customers" canDelete={true} />;
}
