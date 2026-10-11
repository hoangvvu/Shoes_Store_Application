import { OrderDetailView } from '../../components/orders/OrderDetailView';

export default function AdminOrderDetailPage() {
  return <OrderDetailView basePath="/admin/orders" canDelete={true} />;
}
