import { useMemo, useState } from 'react';
import type { PosProduct, PosVariant } from '../../types/order';
import { formatVnd } from '../../utils/format';
import { Modal } from '../common/Modal';

interface Props {
  product: PosProduct;
  /** Số lượng từng biến thể đã có trong giỏ. */
  inCart: Map<number, number>;
  onConfirm: (variant: PosVariant, quantity: number) => void;
  onClose: () => void;
}

/** Chọn đúng biến thể (màu + size) của một sản phẩm rồi xác nhận để thêm vào giỏ. */
export function PosVariantModal({ product, inCart, onConfirm, onClose }: Props) {
  const colors = useMemo(() => {
    const m = new Map<string, PosVariant[]>();
    for (const v of product.variants) m.set(v.colorName, [...(m.get(v.colorName) ?? []), v]);
    return [...m.entries()].map(([name, variants]) => ({
      name,
      variants,
      hex: variants[0].hexCode,
      available: variants.some((v) => v.stockQuantity - (inCart.get(v.variantId) ?? 0) > 0),
    }));
  }, [product, inCart]);

  const [color, setColor] = useState(colors.find((c) => c.available)?.name ?? colors[0]?.name ?? '');
  const [variantId, setVariantId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);

  const sizes = colors.find((c) => c.name === color)?.variants ?? [];
  const variant = sizes.find((v) => v.variantId === variantId) ?? null;
  const remain = variant ? variant.stockQuantity - (inCart.get(variant.variantId) ?? 0) : 0;

  function pickColor(name: string) {
    setColor(name);
    setVariantId(null);
    setQty(1);
  }

  return (
    <Modal title="Chọn màu sắc và size" onClose={onClose}>
      <div className="pos-vm__head">
        <div className="pos-card__img pos-vm__img">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} /> : <span>{product.productName.slice(0, 1)}</span>}
        </div>
        <div>
          <strong>{product.productName}</strong>
          <div className="pos-price">
            <strong>{formatVnd(product.salePrice)}</strong>
            {product.discountPercent > 0 && <><s className="muted">{formatVnd(product.unitPrice)}</s><span className="badge status status--pending">-{product.discountPercent}%</span></>}
          </div>
        </div>
      </div>

      <div className="field">
        <span>Màu sắc</span>
        <div className="pos-options">
          {colors.map((c) => (
            <button key={c.name} type="button" className={`pos-opt${color === c.name ? ' pos-opt--on' : ''}`} disabled={!c.available} onClick={() => pickColor(c.name)}>
              <i className="pos-swatch" style={{ background: c.hex ?? '#ccc' }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Size</span>
        <div className="pos-options">
          {sizes.map((v) => {
            const left = v.stockQuantity - (inCart.get(v.variantId) ?? 0);
            return (
              <button
                key={v.variantId}
                type="button"
                className={`pos-size${variantId === v.variantId ? ' pos-size--picked' : ''}`}
                disabled={left <= 0}
                onClick={() => { setVariantId(v.variantId); setQty(1); }}
              >
                <span className="pos-size__label">{v.sizeLabel}</span>
                <span className="pos-size__stock">{v.stockQuantity <= 0 ? 'Hết' : `Tồn ${v.stockQuantity}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pos-vm__pick">
        {variant ? (
          <>
            <span className="muted">SKU {variant.sku} · Còn thêm được {remain}</span>
            <div className="pos-line__qty">
              <button type="button" className="btn btn--ghost pos-qty-btn" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button>
              <input className="qty-input pos-qty-input" inputMode="numeric" value={qty} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); if (n >= 1) setQty(Math.min(n, remain)); }} aria-label="Số lượng" />
              <button type="button" className="btn btn--ghost pos-qty-btn" disabled={qty >= remain} onClick={() => setQty(qty + 1)}>+</button>
            </div>
          </>
        ) : (
          <span className="muted">Vui lòng chọn size</span>
        )}
      </div>

      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
        <button type="button" className="btn btn--primary" disabled={!variant || remain < 1} onClick={() => variant && onConfirm(variant, qty)}>
          Xác nhận thêm vào giỏ
        </button>
      </div>
    </Modal>
  );
}
