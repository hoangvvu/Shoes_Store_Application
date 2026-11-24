import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productService } from '../../services/product.service';
import type { ProductVariant } from '../../types/product';
import { getErrorMessage } from '../../utils/error';
import { formatNumber, formatVnd } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { Modal } from '../common/Modal';
import { SearchBar } from '../common/SearchBar';
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

  // Phân trang & sắp xếp biến thể theo số lượng: cố định 5 sản phẩm/trang
  const VARIANT_PAGE_SIZE = 5;
  const [variantPage, setVariantPage] = useState(1);
  const [draftSearch, setDraftSearch] = useState('');
  const [draftStockFilter, setDraftStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [draftSort, setDraftSort] = useState<'default' | 'stock_desc' | 'stock_asc'>('default');

  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStockFilter, setAppliedStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [appliedSort, setAppliedSort] = useState<'default' | 'stock_desc' | 'stock_asc'>('default');

  const isPending =
    draftSearch !== appliedSearch ||
    draftStockFilter !== appliedStockFilter ||
    draftSort !== appliedSort;

  function handleSearch() {
    setAppliedSearch(draftSearch);
    setAppliedStockFilter(draftStockFilter);
    setAppliedSort(draftSort);
    setVariantPage(1);
  }

  function handleReset() {
    setDraftSearch('');
    setDraftStockFilter('all');
    setDraftSort('default');
    setAppliedSearch('');
    setAppliedStockFilter('all');
    setAppliedSort('default');
    setVariantPage(1);
  }

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
    const q = appliedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (v) =>
          v.sku.toLowerCase().includes(q) ||
          v.sizeLabel.toLowerCase().includes(q) ||
          v.colorName.toLowerCase().includes(q),
      );
    }

    // Lọc theo trạng thái tồn kho
    if (appliedStockFilter === 'out_of_stock') {
      list = list.filter((v) => v.stockQuantity <= 0);
    } else if (appliedStockFilter === 'low_stock') {
      list = list.filter((v) => v.stockQuantity > 0 && v.stockQuantity <= 5);
    } else if (appliedStockFilter === 'in_stock') {
      list = list.filter((v) => v.stockQuantity > 0);
    }

    // Sắp xếp theo số lượng (Tồn kho)
    if (appliedSort === 'stock_desc') {
      list.sort((a, b) => b.stockQuantity - a.stockQuantity);
    } else if (appliedSort === 'stock_asc') {
      list.sort((a, b) => a.stockQuantity - b.stockQuantity);
    }

    return list;
  }, [product?.variants, appliedSearch, appliedStockFilter, appliedSort]);

  const totalVariantItems = filteredAndSortedVariants.length;
  const totalVariantPages = Math.max(1, Math.ceil(totalVariantItems / VARIANT_PAGE_SIZE));
  const safeVariantPage = Math.min(Math.max(1, variantPage), totalVariantPages);
  const startVariantIndex = (safeVariantPage - 1) * VARIANT_PAGE_SIZE;
  const paginatedVariants = filteredAndSortedVariants.slice(
    startVariantIndex,
    startVariantIndex + VARIANT_PAGE_SIZE,
  );

  function toggleStockSort() {
    setVariantPage(1);
    const nextSort =
      appliedSort === 'default'
        ? 'stock_desc'
        : appliedSort === 'stock_desc'
        ? 'stock_asc'
        : 'default';
    setDraftSort(nextSort);
    setAppliedSort(nextSort);
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

          {/* Thanh công cụ: tìm kiếm theo chuẩn SearchBar dùng chung của hệ thống */}
          <SearchBar
            onSearch={handleSearch}
            hint={isPending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}
          >
            <input
              type="search"
              className="search"
              placeholder="Tìm SKU, size, màu..."
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
            />
            <select
              className="select"
              value={draftStockFilter}
              onChange={(e) => setDraftStockFilter(e.target.value as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock')}
              aria-label="Lọc theo trạng thái tồn kho"
            >
              <option value="all">Tất cả tồn kho</option>
              <option value="in_stock">Còn hàng (&gt; 0)</option>
              <option value="low_stock">Sắp hết hàng (1 - 5)</option>
              <option value="out_of_stock">Hết hàng (= 0)</option>
            </select>
            <select
              className="select"
              value={draftSort}
              onChange={(e) => setDraftSort(e.target.value as 'default' | 'stock_desc' | 'stock_asc')}
              aria-label="Sắp xếp theo số lượng"
            >
              <option value="default">Sắp xếp: Mặc định (Size / Màu)</option>
              <option value="stock_desc">Số lượng: Nhiều nhất trước</option>
              <option value="stock_asc">Số lượng: Ít nhất trước</option>
            </select>
            {(appliedSearch || appliedStockFilter !== 'all' || appliedSort !== 'default' || isPending) && (
              <button
                type="button"
                className="btn btn--ghost small"
                onClick={handleReset}
                title="Đặt lại bộ lọc"
              >
                Đặt lại
              </button>
            )}
          </SearchBar>

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
                    {appliedSort === 'stock_desc' ? (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>▼</span>
                    ) : appliedSort === 'stock_asc' ? (
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
