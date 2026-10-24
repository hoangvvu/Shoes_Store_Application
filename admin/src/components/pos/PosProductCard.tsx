import type { PosProduct } from '../../types/order';
import { formatVnd } from '../../utils/format';

interface Props {
  product: PosProduct;
  /** Tổng số lượng các biến thể của sản phẩm đang có trong giỏ. */
  picked: number;
  onOpen: (product: PosProduct) => void;
}

/** Thẻ sản phẩm gốc: bấm để mở hộp thoại chọn màu / size. */
export function PosProductCard({ product, picked, onOpen }: Props) {
  const soldOut = product.variants.every((v) => v.stockQuantity <= 0);
  return (
    <button type="button" className={`pos-card${soldOut ? ' pos-card--out' : ''}`} onClick={() => onOpen(product)} disabled={soldOut}>
      <span className="pos-card__img">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} loading="lazy" /> : <span>{product.productName.slice(0, 1)}</span>}
        {picked > 0 && <span className="pos-card__picked">Đã chọn {picked}</span>}
        {soldOut && <span className="pos-card__soldout">Hết hàng</span>}
      </span>
      <span className="pos-card__name">{product.productName}</span>
      <span className="muted pos-card__meta">{[product.brandName, product.categoryName].filter(Boolean).join(' · ') || ' '}</span>
      <span className="pos-price">
        <strong>{formatVnd(product.salePrice)}</strong>
        {product.discountPercent > 0 && (
          <>
            <s className="muted">{formatVnd(product.unitPrice)}</s>
            <span className="badge status status--pending">-{product.discountPercent}%</span>
          </>
        )}
      </span>
    </button>
  );
}
