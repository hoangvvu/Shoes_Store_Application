import type { OrderDetail } from '../../types/order';
import { InfoGrid, InfoItem } from '../common/InfoGrid';

type Props = Pick<OrderDetail, 'channel' | 'customerId' | 'customerName' | 'customerPhone' | 'customerAddress' | 'receiverName' | 'receiverPhone' | 'shippingAddress'>;

/**
 * Khung "Giao hàng" luôn hiển thị cho cả đơn online và đơn tại quầy:
 * - Online: người nhận / điện thoại / địa chỉ đã chụp lúc đặt hàng.
 * - POS, khách vãng lai: không có thông tin người nhận.
 * - POS, khách có tài khoản: thông tin đã có của khách, mục nào chưa có thì để trống.
 */
export function RecipientCard({ order }: { order: Props }) {
  const isOnline = order.channel === 'ONLINE';
  const walkIn = !isOnline && order.customerId === null;

  return (
    <section className="card">
      <h3>Giao hàng</h3>
      {walkIn ? (
        <p className="muted">Không có thông tin người nhận (khách vãng lai mua tại quầy).</p>
      ) : (
        <>
          <InfoGrid>
            <InfoItem label="Người nhận">{isOnline ? order.receiverName : order.customerName}</InfoItem>
            <InfoItem label="Điện thoại">{isOnline ? order.receiverPhone : order.customerPhone}</InfoItem>
            <InfoItem label="Địa chỉ" wide>{isOnline ? order.shippingAddress : order.customerAddress}</InfoItem>
          </InfoGrid>
          <p className="muted">
            {isOnline
              ? 'Địa chỉ được chụp lại lúc đặt hàng, không đổi khi khách sửa sổ địa chỉ.'
              : 'Đơn mua tại quầy: hiển thị thông tin đã lưu của khách hàng, mục chưa có để trống.'}
          </p>
        </>
      )}
    </section>
  );
}
