import type { PosProduct, PosVariant } from '../../types/order';
import { formatVnd } from '../../utils/format';

interface Props {
  product: PosProduct;
  /** Số lượng đang có trong giỏ theo variantId. */
  inCart: Map<number, number>;
  onAdd: (product: PosProduct, variant: PosVariant) => void;
}

/** Một sản phẩm: giá bán (giá gốc gạch ngang nếu đang khuyến mãi) và lưới biến thể màu × size kèm tồn kho + số đã chọn. */
export function PosProductCard({ product, inCart, onAdd }: Props) {
  const byColor = new Map<string, PosVariant[]>();
  for (const v of product.variants) byColor.set(v.colorName, [...(byColor.get(v.colorName) ?? []), v]);
  const totalStock = product.variants.reduce((s, v) => s + v.stockQuantity, 0);

  return (
    <article className="pos-product">
      <div className="pos-product__img">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} loading="lazy" /> : <span>{product.productName.slice(0, 1)}</span>}
      </div>
      <div className="pos-product__body">
        <h4 className="pos-product__name">{product.productName}</h4>
        <p className="muted pos-product__meta">
          {[product.brandName, product.categoryName].filter(Boolean).join(' · ') || '—'} · Tổng tồn {totalStock}
        </p>
        <div className="pos-price">
          <strong>{formatVnd(product.salePrice)}</strong>
          {product.discountPercent > 0 && (
            <>
              <s className="muted">{formatVnd(product.unitPrice)}</s>
              <span className="badge status status--pending">-{product.discountPercent}%</span>
            </>
          )}
        </div>

        {[...byColor.entries()].map(([color, variants]) => (
          <div className="pos-color" key={color}>
            <span className="pos-color__name">
              <i className="pos-swatch" style={{ background: variants[0].hexCode ?? '#ccc' }} />
              {color}
            </span>
            <div className="pos-sizes">
              {variants.map((v) => {
                const picked = inCart.get(v.variantId) ?? 0;
                const out = v.stockQuantity <= 0;
                const maxed = picked >= v.stockQuantity;
                return (
                  <button
                    key={v.variantId}
                    type="button"
                    className={`pos-size${picked > 0 ? ' pos-size--picked' : ''}`}
                    disabled={out || maxed}
                    onClick={() => onAdd(product, v)}
                    title={`${v.sku} · Tồn ${v.stockQuantity}${picked ? ` · Đã chọn ${picked}` : ''}`}
                  >
                    <span className="pos-size__label">{v.sizeLabel}</span>
                    <span className="pos-size__stock">{out ? 'Hết' : `Tồn ${v.stockQuantity}`}</span>
                    {picked > 0 && <span className="pos-size__picked">×{picked}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
