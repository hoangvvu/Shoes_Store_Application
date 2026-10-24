import type { PosPreview } from '../../types/order';
import { formatVnd } from '../../utils/format';

export interface CartLine {
  variantId: number;
  productId: number;
  productName: string;
  imageUrl: string | null;
  sku: string;
  sizeLabel: string;
  colorName: string;
  stockQuantity: number;
  quantity: number;
}

interface Props {
  lines: CartLine[];
  preview: PosPreview | null;
  previewing: boolean;
  onQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void;
}

/** Giỏ hàng POS: chỉnh số lượng (không vượt tồn), xóa dòng; giá/giảm giá lấy từ bản tính của backend. */
export function PosCart({ lines, preview, previewing, onQty, onRemove }: Props) {
  if (!lines.length) return <p className="muted center pos-cart__empty">Giỏ hàng trống. Chọn size/màu ở danh sách sản phẩm để thêm.</p>;
  const priced = new Map((preview?.items ?? []).map((i) => [i.variantId, i]));
  const issues = new Map((preview?.issues ?? []).map((i) => [i.variantId, i]));

  return (
    <ul className="pos-cart">
      {lines.map((l) => {
        const p = priced.get(l.variantId);
        const issue = issues.get(l.variantId);
        return (
          <li key={l.variantId} className={`pos-line${issue ? ' pos-line--issue' : ''}`}>
            <div className="pos-line__info">
              <strong>{l.productName}</strong>
              <span className="muted">{l.sku} · Size {l.sizeLabel} · {l.colorName}</span>
              <span className="muted">Tồn kho: {l.stockQuantity}</span>
              {issue && <span className="form-error">{issue.message}</span>}
            </div>
            <div className="pos-line__qty">
              <button type="button" className="btn btn--ghost pos-qty-btn" onClick={() => onQty(l.variantId, l.quantity - 1)} disabled={l.quantity <= 1} aria-label="Giảm">−</button>
              <input
                className="qty-input pos-qty-input"
                inputMode="numeric"
                value={l.quantity}
                aria-label="Số lượng"
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ''));
                  if (n >= 1) onQty(l.variantId, n);
                }}
              />
              <button type="button" className="btn btn--ghost pos-qty-btn" onClick={() => onQty(l.variantId, l.quantity + 1)} disabled={l.quantity >= l.stockQuantity} aria-label="Tăng">+</button>
            </div>
            <div className="pos-line__money">
              {p ? (
                <>
                  <strong>{formatVnd(p.lineTotal)}</strong>
                  <span className="muted">
                    {p.lineDiscount > 0 && <s>{formatVnd(p.unitPrice)}</s>} {formatVnd(Math.round(p.lineTotal / p.quantity))} × {p.quantity}
                  </span>
                  {p.lineDiscount > 0 && <span className="amount-refund">Giảm giá SP {p.discountPercent}%: -{formatVnd(p.lineDiscount)} (cả dòng)</span>}
                </>
              ) : (
                <span className="muted">{previewing ? 'Đang tính…' : '—'}</span>
              )}
            </div>
            <button type="button" className="btn btn--danger pos-line__remove" onClick={() => onRemove(l.variantId)} aria-label="Xóa khỏi giỏ">Xóa</button>
          </li>
        );
      })}
    </ul>
  );
}
