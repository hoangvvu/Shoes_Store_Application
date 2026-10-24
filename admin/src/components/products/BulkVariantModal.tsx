import { type FormEvent, useState } from 'react';
import { catalogService, productService } from '../../services/product.service';
import type { Color, Size } from '../../types/product';
import { getErrorMessage } from '../../utils/error';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { ColorDot, LoadState } from '../common/Widgets';

interface Props {
  productId: number;
  productName: string;
  onClose: () => void;
  onSaved: () => void;
}

/** M4 #9 – Tạo biến thể hàng loạt theo tích Descartes (size × màu). Tồn ban đầu = 0, SKU tự động. */
export function BulkVariantModal({ productId, productName, onClose, onSaved }: Props) {
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: sizes, loading: szLoading, error: szError } = useAsync(() => catalogService.list('sizes'), []);
  const { data: colors, loading: colLoading, error: colError } = useAsync(() => catalogService.list('colors'), []);

  const toggleSize = (id: number) =>
    setSelectedSizes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleColor = (id: number) =>
    setSelectedColors((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectAllSizes = () => {
    if (!sizes) return;
    if (selectedSizes.length === sizes.length) setSelectedSizes([]);
    else setSelectedSizes(sizes.map((s: Size) => s.sizeId));
  };

  const selectAllColors = () => {
    if (!colors) return;
    if (selectedColors.length === colors.length) setSelectedColors([]);
    else setSelectedColors(colors.map((c: Color) => c.colorId));
  };

  const totalCombinations = selectedSizes.length * selectedColors.length;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (selectedSizes.length === 0) return setError('Vui lòng chọn ít nhất một kích thước (size)');
    if (selectedColors.length === 0) return setError('Vui lòng chọn ít nhất một màu sắc');
    setError('');
    setSaving(true);
    try {
      await productService.bulkVariants(productId, selectedSizes, selectedColors);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Sinh biến thể hàng loạt" onClose={onClose} wide>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted" style={{ margin: 0 }}>
          Sản phẩm: <strong>{productName}</strong>. Hệ thống sẽ tạo mọi tổ hợp <code>Size × Màu</code> với mã SKU tự động. Số lượng tồn ban đầu luôn bằng 0.
        </p>

        <LoadState loading={szLoading || colLoading} error={szError || colError} />

        {sizes && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>1. Chọn kích cỡ (Size):</span>
              <button type="button" className="btn btn--ghost small" onClick={selectAllSizes}>
                {selectedSizes.length === sizes.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sizes.map((s: Size) => {
                const checked = selectedSizes.includes(s.sizeId);
                return (
                  <button
                    type="button"
                    key={s.sizeId}
                    className={`btn ${checked ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => toggleSize(s.sizeId)}
                  >
                    Size {s.sizeLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {colors && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>2. Chọn màu sắc:</span>
              <button type="button" className="btn btn--ghost small" onClick={selectAllColors}>
                {selectedColors.length === colors.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {colors.map((c: Color) => {
                const checked = selectedColors.includes(c.colorId);
                return (
                  <button
                    type="button"
                    key={c.colorId}
                    className={`btn ${checked ? 'btn--primary' : 'btn--ghost'}`}
                    onClick={() => toggleColor(c.colorId)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <ColorDot hex={c.hexCode} name="" />
                    {c.colorName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="notice" style={{ margin: '14px 0 0' }}>
          Tổ hợp sẽ tạo: <strong>{totalCombinations}</strong> biến thể mới ({selectedSizes.length} sizes × {selectedColors.length} màu). Các biến thể đã tồn tại sẽ được giữ nguyên.
        </div>

        {error && <p className="form-error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving || totalCombinations === 0}>
            {saving ? 'Đang tạo…' : `Tạo ${totalCombinations} biến thể`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
