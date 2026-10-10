import { CustomerManager } from '../../components/customers/CustomerManager';

export default function SalesCustomersPage() {
  return <CustomerManager basePath="/sales/customers" canDelete={false} />;
}
