import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productService } from '../../services/product.service';
import type { ProductVariant } from '../../types/product';
import { getErrorMessage } from '../../utils/error';
import { formatNumber, formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { ColorDot, LoadState, Thumb } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
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

  // Phân trang & sắp xếp biến thể theo số lượng
  const [variantPage, setVariantPage] = useState(1);
  const [variantPageSize, setVariantPageSize] = useState(10);
  const [variantSort, setVariantSort] = useState<'default' | 'stock_desc' | 'stock_asc'>('default');
  const [variantSearch, setVariantSearch] = useState('');
  const [variantStockFilter, setVariantStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

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

  // Lọc và sắp xếp biến thể
  const filteredAndSortedVariants = useMemo(() => {
    if (!product?.variants) return [];
    let list = [...product.variants];

    // Lọc theo từ khóa (SKU, size, màu)
    const q = variantSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.sizeLabel.toLowerCase().includes(q) ||
          v.colorName.toLowerCase().includes(q),
      );
    }

    // Lọc theo trạng thái tồn kho
    if (variantStockFilter === 'out_of_stock') {
      list = list.filter((v) => v.stockQuantity <= 0);
    } else if (variantStockFilter === 'low_stock') {
      list = list.filter((v) => v.stockQuantity > 0 && v.stockQuantity <= 5);
    } else if (variantStockFilter === 'in_stock') {
      list = list.filter((v) => v.stockQuantity > 0);
    }

    // Sắp xếp theo số lượng (Tồn kho)
    if (variantSort === 'stock_desc') {
      list.sort((a, b) => b.stockQuantity - a.stockQuantity);
    } else if (variantSort === 'stock_asc') {
      list.sort((a, b) => a.stockQuantity - b.stockQuantity);
    }

    return list;
  }, [product?.variants, variantSearch, variantStockFilter, variantSort]);

  const totalVariantItems = filteredAndSortedVariants.length;
  const totalVariantPages = Math.max(1, Math.ceil(totalVariantItems / variantPageSize));
  const safeVariantPage = Math.min(Math.max(1, variantPage), totalVariantPages);
  const startVariantIndex = (safeVariantPage - 1) * variantPageSize;
  const paginatedVariants = filteredAndSortedVariants.slice(
    startVariantIndex,
    startVariantIndex + variantPageSize,
  );

  function toggleStockSort() {
    setVariantPage(1);
    setVariantSort((prev) => {
      if (prev === 'default') return 'stock_desc';
      if (prev === 'stock_desc') return 'stock_asc';
      return 'default';
    });
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
            <dt>Nhà cung cấp đối tác</dt>
            <dd>
              {product.supplierName ? (
                <span className="badge badge--neutral">{product.supplierName}</span>
              ) : (
                '—'
              )}
            </dd>
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
            </div>
          </div>

          {/* Thanh công cụ: tìm kiếm, sắp xếp theo số lượng và phân trang */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <input
                type="search"
                className="input"
                placeholder="Tìm SKU, size, màu..."
                value={variantSearch}
                onChange={(e) => {
                  setVariantSearch(e.target.value);
                  setVariantPage(1);
                }}
                style={{ width: '100%' }}
              />
            </div>
            <select
              className="select"
              value={variantSort}
              onChange={(e) => {
                setVariantSort(e.target.value as 'default' | 'stock_desc' | 'stock_asc');
                setVariantPage(1);
              }}
              aria-label="Sắp xếp theo số lượng"
              style={{ minWidth: 190 }}
            >
              <option value="default">Sắp xếp: Mặc định (Size / Màu)</option>
              <option value="stock_desc">Số lượng: Nhiều nhất trước (Giảm dần)</option>
              <option value="stock_asc">Số lượng: Ít nhất trước (Tăng dần)</option>
            </select>
            <select
              className="select"
              value={variantStockFilter}
              onChange={(e) => {
                setVariantStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock');
                setVariantPage(1);
              }}
              aria-label="Lọc theo trạng thái tồn kho"
              style={{ minWidth: 140 }}
            >
              <option value="all">Tất cả tồn kho</option>
              <option value="in_stock">Còn hàng (&gt; 0)</option>
              <option value="low_stock">Sắp hết hàng (1 - 5)</option>
              <option value="out_of_stock">Hết hàng (= 0)</option>
            </select>
            <select
              className="select"
              value={variantPageSize}
              onChange={(e) => {
                setVariantPageSize(Number(e.target.value));
                setVariantPage(1);
              }}
              aria-label="Số biến thể mỗi trang"
              style={{ width: 110 }}
            >
              <option value="5">5 / trang</option>
              <option value="10">10 / trang</option>
              <option value="20">20 / trang</option>
              <option value="50">50 / trang</option>
            </select>
            {(variantSearch || variantStockFilter !== 'all' || variantSort !== 'default') && (
              <button
                type="button"
                className="btn btn--ghost small"
                onClick={() => {
                  setVariantSearch('');
                  setVariantStockFilter('all');
                  setVariantSort('default');
                  setVariantPage(1);
                }}
              >
                Đặt lại
              </button>
            )}
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã SKU</th>
                  <th>Kích cỡ</th>
                  <th>Màu sắc</th>
                  <th
                    className="num"
                    onClick={toggleStockSort}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Bấm để đổi sắp xếp theo số lượng tồn kho (Nhiều → Ít / Ít → Nhiều)"
                  >
                    Tồn kho{' '}
                    {variantSort === 'stock_desc' ? (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>▼</span>
                    ) : variantSort === 'stock_asc' ? (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>▲</span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>↕</span>
                    )}
                  </th>
                  {canEdit && <th className="actions-col" style={{ textAlign: 'right', minWidth: 160 }}>Thao tác</th>}
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
                {product.variants && product.variants.length > 0 && paginatedVariants.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted center">
                      Không tìm thấy biến thể nào phù hợp với điều kiện lọc.
                    </td>
                  </tr>
                )}
                {paginatedVariants.map((v: ProductVariant) => (
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
                        <div className="actions-group">
                          <button className="btn btn--ghost" onClick={() => setEditingVariant(v)}>Sửa SKU</button>
                          <button className="btn btn--danger" onClick={() => removeVariant(v)}>Xóa</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang biến thể */}
          {totalVariantItems > 0 && (
            <div style={{ marginTop: 12 }}>
              <Pagination
                page={safeVariantPage}
                totalPages={totalVariantPages}
                total={totalVariantItems}
                onChange={setVariantPage}
              />
            </div>
          )}
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
