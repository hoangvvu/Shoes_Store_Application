import { useState } from 'react';
import { orderService } from '../../services/order.service';
import type { OrderDetail } from '../../types/order';
import { getErrorMessage } from '../../utils/error';
import { formatVnd } from '../../utils/format';
import { Modal } from '../common/Modal';

interface Props {
  order: OrderDetail;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Sửa số lượng / xóa dòng khi đơn còn PENDING. Thêm sản phẩm mới cần tra cứu sản phẩm (module Sản phẩm)
 * nên sẽ bổ sung khi có API tìm sản phẩm; backend PUT /orders/:id/items đã hỗ trợ sẵn.
 */
export function EditItemsModal({ order, onClose, onSaved }: Props) {
  const [lines, setLines] = useState(order.items.map((i) => ({ ...i })));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setQty = (variantId: number, quantity: number) =>
    setLines((ls) => ls.map((l) => (l.variantId === variantId ? { ...l, quantity } : l)));
  const removeLine = (variantId: number) => setLines((ls) => ls.filter((l) => l.variantId !== variantId));

  async function save() {
    setError('');
    if (!lines.length) return setError('Đơn phải còn ít nhất 1 sản phẩm. Muốn bỏ hết hãy hủy đơn.');
    if (lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) return setError('Số lượng phải là số nguyên lớn hơn 0');
    setSaving(true);
    try {
      await orderService.editItems(order.invoiceId, lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })));
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Modal title={`Sửa sản phẩm đơn #${order.invoiceId}`} onClose={onClose}>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Sản phẩm</th><th className="num">Đơn giá</th><th>Số lượng</th><th /></tr></thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.variantId}>
                <td>{l.productName}<br /><span className="muted">Size {l.sizeLabel} · {l.colorName}</span></td>
                <td className="num">{formatVnd(l.salePrice)}</td>
                <td><input className="qty-input" type="number" min={1} max={999} value={l.quantity} onChange={(e) => setQty(l.variantId, Number(e.target.value))} /></td>
                <td><button className="btn btn--danger" onClick={() => removeLine(l.variantId)}>Xóa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Giá và khuyến mãi sẽ được tính lại theo giá hiện hành khi lưu.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form__actions">
        <button className="btn btn--ghost" onClick={onClose}>Hủy</button>
        <button className="btn btn--primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
      </div>
    </Modal>
  );
}
