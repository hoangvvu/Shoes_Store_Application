import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productService } from '../../services/product.service';
import type { ProductVariant } from '../../types/product';
import { getErrorMessage } from '../../utils/error';
import { formatNumber, formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { ColorDot, LoadState, Thumb } from '../common/Widgets';
import { BulkVariantModal } from './BulkVariantModal';
import { ProductFormModal } from './ProductFormModal';

interface Props {
  basePath: string;
  canEdit?: boolean;
}

/** M4 #10, #14 – Xem chi tiết sản phẩm, danh sách biến thể, sửa SKU và xóa mềm biến thể. */
export function ProductDetailView({ basePath, canEdit = true }: Props) {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const [editingProduct, setEditingProduct] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);

  const { data: product, loading, error, reload } = useAsync(
    () => productService.get(productId),
    [productId],
  );

  async function removeVariant(v: ProductVariant) {
    if (!window.confirm(`Xóa biến thể "${v.sku}" (Size ${v.sizeLabel} - ${v.colorName})?`)) return;
    try {
      await productService.removeVariant(v.variantId);
      void reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  if (loading) return <LoadState loading={true} error="" />;
  if (error || !product) return <LoadState loading={false} error={error || 'Không tìm thấy sản phẩm'} />;

  return (
    <>
      <div className="page-header">
        <div>
          <Link to={basePath} className="link small">‹ Danh sách sản phẩm</Link>
          <h1 style={{ marginTop: 4 }}>{product.productName}</h1>
          <p className="muted">Mã sản phẩm: #{product.productId} · ĐVT: {product.unit}</p>
        </div>
        {canEdit && (
          <div className="page-header__actions">
            <button className="btn btn--ghost" onClick={() => setBulkModal(true)}>+ Sinh biến thể hàng loạt</button>
            <button className="btn btn--primary" onClick={() => setEditingProduct(true)}>Sửa thông tin</button>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Thông tin chung</h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <Thumb src={product.imageUrl} alt={product.productName} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>
                {formatVnd(product.currentPrice)}
              </div>
              <div className="muted" style={{ marginTop: 4 }}>
                Trạng thái:{' '}
                <span className={`badge ${product.isActive ? 'badge--ok' : 'badge--muted'}`}>
                  {product.isActive ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                </span>
              </div>
            </div>
          </div>

          <dl className="kv">
            <dt>Danh mục</dt>
            <dd>{product.categoryName || '—'}</dd>
            <dt>Thương hiệu</dt>
            <dd>{product.brandName || '—'}</dd>
            <dt>Đơn vị tính</dt>
            <dd>{product.unit}</dd>
            <dt>Tổng tồn kho</dt>
            <dd><strong>{formatNumber(product.totalStock)}</strong> {product.unit}</dd>
            <dt>Số biến thể</dt>
            <dd>{product.variants?.length ?? 0}</dd>
            <dt>Mô tả</dt>
            <dd>{product.description || <span className="muted">Không có mô tả</span>}</dd>
          </dl>
        </div>

        <div className="card">
          <div className="page-header" style={{ marginBottom: 12 }}>
            <div>
              <h3>Danh sách biến thể ({product.variants?.length ?? 0})</h3>
              <p className="muted small">Tổ hợp kích thước và màu sắc. Tồn kho biến động qua Phiếu nhập & Sổ kho.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Kích cỡ</th>
                  <th>Màu sắc</th>
                  <th className="num">Tồn kho</th>
                  {canEdit && <th className="actions-col" />}
                </tr>
              </thead>
              <tbody>
                {(!product.variants || product.variants.length === 0) && (
                  <tr>
                    <td colSpan={5} className="muted center">
                      Chưa có biến thể nào. Bấm "Sinh biến thể hàng loạt" để tạo tổ hợp Size × Màu.
                    </td>
                  </tr>
                )}
                {product.variants?.map((v: ProductVariant) => (
                  <tr key={v.variantId}>
                    <td><code>{v.sku}</code></td>
                    <td><span className="badge badge--ok">{v.sizeLabel}</span></td>
                    <td><ColorDot hex={v.hexCode} name={v.colorName} /></td>
                    <td className="num">
                      <span className={`badge ${v.stockQuantity <= 0 ? 'badge--danger' : v.stockQuantity <= 5 ? 'badge--warning' : 'badge--ok'}`}>
                        {formatNumber(v.stockQuantity)}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="actions">
                        <button className="btn btn--ghost" onClick={() => setEditingVariant(v)}>Sửa SKU</button>
                        <button className="btn btn--danger" onClick={() => removeVariant(v)}>Xóa</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingProduct && (
        <ProductFormModal
          product={product}
          onClose={() => setEditingProduct(false)}
          onSaved={() => {
            setEditingProduct(false);
            void reload();
          }}
        />
      )}

      {bulkModal && (
        <BulkVariantModal
          productId={product.productId}
          productName={product.productName}
          onClose={() => setBulkModal(false)}
          onSaved={() => {
            setBulkModal(false);
            void reload();
          }}
        />
      )}

      {editingVariant && (
        <EditVariantModal
          variant={editingVariant}
          onClose={() => setEditingVariant(null)}
          onSaved={() => {
            setEditingVariant(null);
            void reload();
          }}
        />
      )}
    </>
  );
}

function EditVariantModal({ variant, onClose, onSaved }: { variant: ProductVariant; onClose: () => void; onSaved: () => void }) {
  const [sku, setSku] = useState(variant.sku);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sku.trim()) return setError('SKU không được để trống');
    setError('');
    setSaving(true);
    try {
      await productService.updateVariant(variant.variantId, sku.trim());
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Sửa mã SKU biến thể" onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <p className="muted">
          Biến thể: <strong>Size {variant.sizeLabel} - {variant.colorName}</strong>
        </p>
        <label className="field">
          <span>Mã SKU *</span>
          <input value={sku} onChange={(e) => setSku(e.target.value)} autoFocus />
        </label>
        <p className="muted small">Lưu ý: Không thể sửa số lượng tồn kho trực tiếp tại đây. Mọi biến động tồn kho phải thông qua Phiếu nhập hoặc Điều chỉnh tồn kho.</p>
        {error && <p className="form-error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
