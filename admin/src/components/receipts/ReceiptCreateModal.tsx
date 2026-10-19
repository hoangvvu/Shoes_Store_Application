import { type FormEvent, useState } from 'react';
import { inventoryService, receiptService, supplierService } from '../../services/inventory.service';
import type { StockItem, Supplier } from '../../types/inventory';
import { getErrorMessage } from '../../utils/error';
import { formatNumber, formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { LoadState } from '../common/Widgets';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface DraftLine {
  variantId: number;
  variantLabel: string;
  sku: string;
  quantity: number;
  importPrice: number;
}

/** M5 #2 – Lập phiếu nhập kho. Thêm dòng, tính tạm tính thành tiền; trigger backend tự tăng kho và tính tổng tiền phiếu. */
export function ReceiptCreateModal({ onClose, onSaved }: Props) {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [qtyInput, setQtyInput] = useState('10');
  const [priceInput, setPriceInput] = useState('500000');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: suppliers, loading: supLoading } = useAsync(() => supplierService.list({ page: 1, size: 100 }), []);
  const { data: stockData, loading: stLoading } = useAsync(() => inventoryService.list({ page: 1, size: 200 }), []);

  const variants = stockData?.items || [];

  const addLine = () => {
    if (!selectedVariantId) return setError('Vui lòng chọn biến thể cần nhập hàng');
    const q = Number(qtyInput);
    const p = Number(priceInput);
    if (!Number.isFinite(q) || q <= 0) return setError('Số lượng nhập phải lớn hơn 0');
    if (!Number.isFinite(p) || p < 0) return setError('Giá nhập không được âm');

    const v = variants.find((x: StockItem) => x.variantId === selectedVariantId);
    if (!v) return;

    setError('');
    // Nếu biến thể đã có trong danh sách -> cộng dồn số lượng
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.variantId === v.variantId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += q;
        next[idx].importPrice = p;
        return next;
      }
      return [
        ...prev,
        {
          variantId: v.variantId,
          variantLabel: `${v.productName} (Size ${v.sizeLabel} - ${v.colorName})`,
          sku: v.sku,
          quantity: q,
          importPrice: p,
        },
      ];
    });

    // Reset input
    setSelectedVariantId('');
    setQtyInput('10');
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const grandTotal = lines.reduce((sum, l) => sum + l.quantity * l.importPrice, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supplierId) return setError('Vui lòng chọn nhà cung cấp');
    if (lines.length === 0) return setError('Phiếu nhập phải có ít nhất một dòng hàng');
    setError('');
    setSaving(true);
    try {
      await receiptService.create({
        supplierId: Number(supplierId),
        lines: lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          importPrice: l.importPrice,
        })),
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Lập phiếu nhập kho" onClose={onClose} wide>
      <form onSubmit={submit} className="form" noValidate>
        <LoadState loading={supLoading || stLoading} error="" />

        <label className="field">
          <span>Nhà cung cấp đối tác *</span>
          <select className="select" value={supplierId} onChange={(e) => setSupplierId(e.target.value ? Number(e.target.value) : '')} autoFocus>
            <option value="">-- Chọn nhà cung cấp --</option>
            {suppliers?.items.map((s: Supplier) => (
              <option key={s.supplierId} value={s.supplierId}>{s.supplierName} ({s.phone || 'Chưa có SĐT'})</option>
            ))}
          </select>
        </label>

        <fieldset className="fieldset">
          <legend>Thêm dòng hàng vào phiếu nhập</legend>
          <div className="form-grid" style={{ alignItems: 'flex-end' }}>
            <label className="field span-2">
              <span>Chọn sản phẩm / biến thể (Size × Màu)</span>
              <select className="select" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">-- Chọn biến thể giày --</option>
                {variants.map((v: StockItem) => (
                  <option key={v.variantId} value={v.variantId}>
                    {v.sku} · {v.productName} (Size {v.sizeLabel} - {v.colorName}) [Tồn hiện tại: {v.stockQuantity}]
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Số lượng nhập</span>
              <input type="number" min={1} value={qtyInput} onChange={(e) => setQtyInput(e.target.value)} />
            </label>

            <label className="field">
              <span>Giá nhập / đôi (VND)</span>
              <input type="number" min={0} step={10000} value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
            </label>
          </div>

          <div style={{ marginTop: 10, textAlign: 'right' }}>
            <button type="button" className="btn btn--primary" onClick={addLine}>+ Thêm vào danh sách</button>
          </div>
        </fieldset>

        {lines.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sản phẩm & Biến thể</th>
                  <th>Mã SKU</th>
                  <th className="num">SL nhập</th>
                  <th className="num">Giá nhập</th>
                  <th className="num">Thành tiền</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={l.variantId}>
                    <td>{l.variantLabel}</td>
                    <td><code>{l.sku}</code></td>
                    <td className="num font-bold">{formatNumber(l.quantity)}</td>
                    <td className="num">{formatVnd(l.importPrice)}</td>
                    <td className="num font-bold">{formatVnd(l.quantity * l.importPrice)}</td>
                    <td className="actions">
                      <button type="button" className="btn btn--danger" onClick={() => removeLine(idx)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="totals-box">
          <dt>Số mặt hàng:</dt>
          <dd>{lines.length} dòng</dd>
          <dt>Tổng số lượng nhập:</dt>
          <dd>{formatNumber(lines.reduce((a, b) => a + b.quantity, 0))} đôi</dd>
          <dt className="grand">Tạm tính tổng tiền:</dt>
          <dd className="grand" style={{ color: '#059669' }}>{formatVnd(grandTotal)}</dd>
        </div>

        <p className="muted small">
          Khi lưu phiếu, trigger trong CSDL sẽ tự động ghi sổ kho (<code>IMPORT</code>) và cộng dồn số lượng tồn kho ngay lập tức. Toàn bộ thao tác chạy trong 1 Transaction an toàn.
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving || lines.length === 0}>
            {saving ? 'Đang lưu phiếu…' : 'Xác nhận nhập kho'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
