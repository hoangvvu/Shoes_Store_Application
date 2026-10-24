import type { ReactNode } from 'react';
import { formatVnd } from '../../utils/format';

interface Props {
  /** Tổng tiền hàng trước mọi khoản giảm (Σ đơn giá gốc × số lượng). */
  gross: number;
  /** Giảm giá theo từng sản phẩm (khuyến mãi sản phẩm), cộng dồn cả dòng. */
  productDiscount: number;
  /** Giảm giá tính trên TỔNG tiền hàng (voucher / mức hóa đơn). */
  invoiceDiscount: number;
  invoiceDiscountNote?: ReactNode;
  payable: number;
  payableLabel?: string;
  /** Các dòng phụ phía dưới số phải trả (đã thanh toán, đã hoàn, thực thu, tiền thừa…). */
  extra?: { label: string; value: string; tone?: 'refund' | 'strong' }[];
}

/** Tóm tắt chi phí: tổng trước giảm → các khoản giảm giá (tách theo sản phẩm / theo hóa đơn) → số phải trả. */
export function AmountSummary({ gross, productDiscount, invoiceDiscount, invoiceDiscountNote, payable, payableLabel = 'Phải trả', extra }: Props) {
  return (
    <dl className="summary">
      <div className="summary__row">
        <dt>Tổng tiền hàng (trước giảm)</dt>
        <dd>{formatVnd(gross)}</dd>
      </div>
      <div className="summary__group">Các khoản giảm giá</div>
      <div className="summary__row summary__row--discount">
        <dt>Giảm giá sản phẩm<small>Khuyến mãi áp dụng riêng từng sản phẩm</small></dt>
        <dd>-{formatVnd(productDiscount)}</dd>
      </div>
      <div className="summary__row summary__row--discount">
        <dt>Giảm giá hóa đơn<small>{invoiceDiscountNote ?? 'Tính trên tổng tiền hàng sau giảm sản phẩm'}</small></dt>
        <dd>-{formatVnd(invoiceDiscount)}</dd>
      </div>
      <div className="summary__row summary__row--sub">
        <dt>Tổng giảm</dt>
        <dd>-{formatVnd(productDiscount + invoiceDiscount)}</dd>
      </div>
      <div className="summary__total">
        <dt>{payableLabel}</dt>
        <dd>{formatVnd(payable)}</dd>
      </div>
      {extra?.map((r) => (
        <div key={r.label} className={`summary__row${r.tone === 'refund' ? ' summary__row--refund' : ''}${r.tone === 'strong' ? ' summary__row--strong' : ''}`}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
