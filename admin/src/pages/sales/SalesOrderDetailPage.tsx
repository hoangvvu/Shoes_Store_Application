import { OrderDetailView } from '../../components/orders/OrderDetailView';

export default function SalesOrderDetailPage() {
  return <OrderDetailView basePath="/sales/orders" canDelete={false} />;
}
