import { useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogService, productService } from '../../services/product.service';
import type { Brand, Category, ProductDetail, ProductListItem } from '../../types/product';
import { getErrorMessage } from '../../utils/error';
import { formatNumber, formatVnd } from '../../utils/format';
import { useAsync, useDebounced } from '../../utils/useAsync';
import { PageHeader } from '../common/PageHeader';
import { LoadState, Thumb } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
import { BulkVariantModal } from './BulkVariantModal';
import { ProductFormModal } from './ProductFormModal';

const SIZE = 10;

interface Props {
  basePath: string;
  canEdit?: boolean;
}

/** Quản lý danh sách sản phẩm, lọc theo danh mục/hãng/trạng thái, tìm kiếm, tạo biến thể, ẩn/hiện, xóa mềm. */
export function ProductManager({ basePath, canEdit = true }: Props) {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [brandId, setBrandId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<string>('');
  const [page, setPage] = useState(1);
  const search = useDebounced(q.trim());
  const [modal, setModal] = useState<{ product?: ProductDetail } | null>(null);
  const [bulkModal, setBulkModal] = useState<{ productId: number; productName: string } | null>(null);

  const { data: categories } = useAsync(() => catalogService.list('categories'), []);
  const { data: brands } = useAsync(() => catalogService.list('brands'), []);

  const { data, loading, error, reload } = useAsync(
    () =>
      productService.list({
        q: search,
        categoryId: categoryId === '' ? undefined : categoryId,
        brandId: brandId === '' ? undefined : brandId,
        isActive: isActive === '' ? undefined : isActive === 'true',
        page,
        size: SIZE,
      }),
    [search, categoryId, brandId, isActive, page],
  );

  async function toggleActive(p: ProductListItem) {
    try {
      await productService.setActive(p.productId, !p.isActive);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function remove(p: ProductListItem) {
    if (!window.confirm(`Xóa mềm sản phẩm "${p.productName}" và toàn bộ biến thể? Các đơn hàng cũ vẫn được bảo lưu.`)) return;
    try {
      await productService.remove(p.productId);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Sản phẩm & Biến thể"
        subtitle="Danh mục giày, giá bán, tổng tồn kho và các biến thể kích thước / màu sắc"
        actions={canEdit ? (
          <button className="btn btn--primary" onClick={() => setModal({})}>+ Thêm sản phẩm</button>
        ) : undefined}
      />

      <div className="card">
        <div className="filters">
          <input
            className="search"
            placeholder="Tìm theo tên sản phẩm…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
          <select
            className="select"
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          >
            <option value="">Tất cả danh mục</option>
            {categories?.map((c: Category) => (
              <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
            ))}
          </select>
          <select
            className="select"
            value={brandId}
            onChange={(e) => { setBrandId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          >
            <option value="">Tất cả thương hiệu</option>
            {brands?.map((b: Brand) => (
              <option key={b.brandId} value={b.brandId}>{b.brandName}</option>
            ))}
          </select>
          <select
            className="select"
            value={isActive}
            onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang kinh doanh</option>
            <option value="false">Ngừng kinh doanh</option>
          </select>
        </div>

        <LoadState loading={loading} error={error} empty={!loading && data?.items.length === 0} emptyText="Không tìm thấy sản phẩm nào" />

        {data && data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Danh mục / Hãng</th>
                  <th className="num">Giá bán</th>
                  <th className="num">Biến thể</th>
                  <th className="num">Tổng tồn</th>
                  <th>Trạng thái</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((p: ProductListItem) => (
                  <tr key={p.productId}>
                    <td><Thumb src={p.imageUrl} alt={p.productName} /></td>
                    <td>
                      <Link to={`${basePath}/${p.productId}`} className="link">{p.productName}</Link>
                      <div className="muted small">#{p.productId} · ĐVT: {p.unit}</div>
                    </td>
                    <td>
                      <div>{p.categoryName || '—'}</div>
                      <small className="muted">{p.brandName || '—'}</small>
                    </td>
                    <td className="num font-bold">{formatVnd(p.currentPrice)}</td>
                    <td className="num">{formatNumber(p.variantCount)}</td>
                    <td className="num">
                      <span className={`badge ${p.totalStock <= 0 ? 'badge--danger' : p.totalStock <= 5 ? 'badge--warning' : 'badge--ok'}`}>
                        {formatNumber(p.totalStock)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isActive ? 'badge--ok' : 'badge--muted'}`}>
                        {p.isActive ? 'Đang bán' : 'Ẩn / Ngừng bán'}
                      </span>
                    </td>
                    <td className="actions">
                      <Link to={`${basePath}/${p.productId}`} className="btn btn--ghost">Chi tiết</Link>
                      {canEdit && (
                        <>
                          <button
                            className="btn btn--ghost"
                            onClick={() => setBulkModal({ productId: p.productId, productName: p.productName })}
                            title="Tạo tổ hợp biến thể Size × Màu cho sản phẩm"
                          >
                            + Biến thể
                          </button>
                          <button
                            className="btn btn--ghost"
                            onClick={() => toggleActive(p)}
                            title={p.isActive ? 'Chuyển sang ngừng kinh doanh' : 'Bật lại kinh doanh'}
                          >
                            {p.isActive ? 'Ẩn' : 'Hiện'}
                          </button>
                          <button className="btn btn--danger" onClick={() => remove(p)}>Xóa</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {modal && (
        <ProductFormModal
          product={modal.product}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            void reload();
          }}
        />
      )}

      {bulkModal && (
        <BulkVariantModal
          productId={bulkModal.productId}
          productName={bulkModal.productName}
          onClose={() => setBulkModal(null)}
          onSaved={() => {
            setBulkModal(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
