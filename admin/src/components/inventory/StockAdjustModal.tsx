import { type FormEvent, useState } from 'react';
import { inventoryService } from '../../services/inventory.service';
import type { StockItem } from '../../types/inventory';
import { getErrorMessage } from '../../utils/error';
import { formatNumber } from '../../utils/format';
import { Modal } from '../common/Modal';

interface Props {
  variant: StockItem;
  onClose: () => void;
  onSaved: () => void;
}

/** M6 #3 – Điều chỉnh tồn kho khi kiểm kê, hỏng hoặc mất mát. Bắt buộc có lý do, gọi sp_adjust_stock. */
export function StockAdjustModal({ variant, onClose, onSaved }: Props) {
  const currentStock = variant.stockQuantity;
  const [mode, setMode] = useState<'actual' | 'diff'>('actual');
  const [actualInput, setActualInput] = useState(String(currentStock));
  const [diffInput, setDiffInput] = useState('0');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const diff = mode === 'actual' ? Number(actualInput) - currentStock : Number(diffInput);
  const targetStock = currentStock + diff;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return setError('Bắt buộc phải nhập lý do điều chỉnh tồn kho');
    if (!Number.isFinite(diff) || diff === 0) return setError('Chênh lệch tồn kho phải khác 0');
    if (targetStock < 0) return setError('Tồn kho sau điều chỉnh không được nhỏ hơn 0');

    setError('');
    setSaving(true);
    try {
      await inventoryService.adjust({
        variantId: variant.variantId,
        quantityChange: diff,
        reason: reason.trim(),
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Điều chỉnh tồn kho / Kiểm kê" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <div>
          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>{variant.productName}</h4>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            Mã SKU: <code>{variant.sku}</code> · Size: <strong>{variant.sizeLabel}</strong> · Màu: <strong>{variant.colorName}</strong>
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 14 }}>
            Tồn kho hiện tại trong sổ: <strong>{formatNumber(currentStock)}</strong> đôi
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className={`btn ${mode === 'actual' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('actual')}
          >
            Nhập số lượng thực tế
          </button>
          <button
            type="button"
            className={`btn ${mode === 'diff' ? 'btn--primary' : 'btn--ghost'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('diff')}
          >
            Nhập số chênh lệch (±)
          </button>
        </div>

        {mode === 'actual' ? (
          <label className="field">
            <span>Số lượng đếm được thực tế *</span>
            <input
              type="number"
              min={0}
              value={actualInput}
              onChange={(e) => setActualInput(e.target.value)}
              autoFocus
            />
          </label>
        ) : (
          <label className="field">
            <span>Số lượng điều chỉnh (Dương = Tăng, Âm = Giảm) *</span>
            <input
              type="number"
              value={diffInput}
              onChange={(e) => setDiffInput(e.target.value)}
              autoFocus
            />
          </label>
        )}

        <div className="notice" style={{ margin: 0 }}>
          Biến động ghi sổ: <strong>{diff > 0 ? `+${diff}` : diff}</strong> đôi.
          Tồn sau điều chỉnh: <strong style={{ color: targetStock < 0 ? '#dc2626' : '#059669' }}>{targetStock}</strong> đôi.
        </div>

        <label className="field">
          <span>Lý do điều chỉnh (Bắt buộc) *</span>
          <textarea
            className="textarea"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Kiểm kê định kỳ phát hiện thừa 1 đôi, Rách hộp hỏng đế không bán được..."
          />
        </label>

        <p className="muted small">
          Hành động này sẽ thực thi thủ tục <code>sp_adjust_stock</code>, ghi bút toán vào <code>inventory_transactions</code> (loại {diff > 0 ? 'ADJUST_IN' : 'ADJUST_OUT'}) và tự động lưu nhật ký audit.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving || diff === 0 || targetStock < 0}>
            {saving ? 'Đang điều chỉnh…' : 'Xác nhận điều chỉnh'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
