import type { OrderStatus } from '../../types/order';
import { ORDER_STATUS_LABEL } from '../../utils/format';

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge status status--${status.toLowerCase()}`}>{ORDER_STATUS_LABEL[status] ?? status}</span>;
}
