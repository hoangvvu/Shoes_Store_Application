import type { OrderStatus } from '../../types/order';
import { ORDER_STATUS_LABEL } from '../../utils/format';
import { PAYMENT_STATUS_LABEL } from '../../utils/order';

/**
 * Trạng thái HOÀN THÀNH (xử lý đơn) – khác với trạng thái hoàn tiền (thanh toán):
 * một hóa đơn có thể "Hoàn thành" nhưng đã (hoặc một phần) "Hoàn tiền", hoặc "Đã hủy" sau khi thu tiền rồi hoàn lại.
 */
export function CompletionBadge({ status }: { status: OrderStatus }) {
  const label = status === 'DELIVERED' ? 'Hoàn thành' : (ORDER_STATUS_LABEL[status] ?? status);
  return <span className={`badge status status--${status.toLowerCase()}`}>{label}</span>;
}

const PAY_CLASS: Record<string, string> = {
  PAID: 'pay--paid',
  PARTIALLY_REFUNDED: 'pay--partial-refund',
  REFUNDED: 'pay--refunded',
};

/** Thanh toán / hoàn tiền: Đã thanh toán · Hoàn tiền một phần · Đã hoàn tiền. */
export function PaymentBadge({ status }: { status: string }) {
  return <span className={`badge ${PAY_CLASS[status] ?? 'badge--muted'}`}>{PAYMENT_STATUS_LABEL[status] ?? status}</span>;
}
