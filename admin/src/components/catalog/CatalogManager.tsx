import { type FormEvent, useState, useMemo } from 'react';
import { catalogService } from '../../services/product.service';
import type { Brand, Category, Color, Size } from '../../types/product';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { getErrorMessage } from '../../utils/error';
import { useAsync } from '../../utils/useAsync';
import { validateHex } from '../../utils/validators';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { ColorDot, LoadState, Tabs } from '../common/Widgets';

type TabKey = 'categories' | 'brands' | 'sizes' | 'colors';

interface CatalogFilters {
  q: string;
  scope: TabKey;
}

const EMPTY_CATALOG_FILTERS: CatalogFilters = { q: '', scope: 'categories' };

export function CatalogManager() {
  const [tab, setTab] = useState<TabKey>('categories');
  const [modal, setModal] = useState<{ kind: TabKey; item?: any } | null>(null);

  const { draft, applied, set, apply } = useSearchFilters<CatalogFilters>(EMPTY_CATALOG_FILTERS);

  const { data: categories, loading: catLoading, error: catError, reload: reloadCat } = useAsync(
    () => catalogService.list('categories'),
    [],
  );
  const { data: brands, loading: brLoading, error: brError, reload: reloadBr } = useAsync(
    () => catalogService.list('brands'),
    [],
  );
  const { data: sizes, loading: szLoading, error: szError, reload: reloadSz } = useAsync(
    () => catalogService.list('sizes'),
    [],
  );
  const { data: colors, loading: colLoading, error: colError, reload: reloadCol } = useAsync(
    () => catalogService.list('colors'),
    [],
  );

  const reloadCurrent = () => {
    if (tab === 'categories') void reloadCat();
    if (tab === 'brands') void reloadBr();
    if (tab === 'sizes') void reloadSz();
    if (tab === 'colors') void reloadCol();
  };

  function handleTabChange(nextTab: TabKey) {
    setTab(nextTab);
  }

  function handleSearch() {
    apply();
    if (draft.scope && draft.scope !== tab) {
      setTab(draft.scope);
    }
  }

  const query = applied.q.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (!query) return categories;
    return categories.filter(
      (c) => c.categoryName.toLowerCase().includes(query) || String(c.categoryId) === query,
    );
  }, [categories, query]);

  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    if (!query) return brands;
    return brands.filter(
      (b) => b.brandName.toLowerCase().includes(query) || String(b.brandId) === query,
    );
  }, [brands, query]);

  const filteredSizes = useMemo(() => {
    if (!sizes) return [];
    if (!query) return sizes;
    return sizes.filter(
      (s) => s.sizeLabel.toLowerCase().includes(query) || String(s.sizeId) === query,
    );
  }, [sizes, query]);

  const filteredColors = useMemo(() => {
    if (!colors) return [];
    if (!query) return colors;
    return colors.filter(
      (c) =>
        c.colorName.toLowerCase().includes(query) ||
        (c.hexCode ? c.hexCode.toLowerCase().includes(query) : false) ||
        String(c.colorId) === query,
    );
  }, [colors, query]);

  async function remove(kind: TabKey, id: number, label: string) {
    if (!window.confirm(`Xóa mềm mục "${label}"? Các sản phẩm cũ đã liên kết vẫn được giữ an toàn.`)) return;
    try {
      await catalogService.remove(kind, id);
      reloadCurrent();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  return (
    <>
      <PageHeader
        title="Loại sản phẩm"
        actions={
          <button className="btn btn--primary" onClick={() => setModal({ kind: tab })}>
            + Thêm {tab === 'categories' ? 'Loại sản phẩm' : tab === 'brands' ? 'thương hiệu' : tab === 'sizes' ? 'kích cỡ' : 'màu sắc'}
          </button>
        }
      />

      <div className="card">
        <Tabs<TabKey>
          value={tab}
          onChange={handleTabChange}
          tabs={[
            { key: 'categories', label: `Loại sản phẩm (${categories?.length ?? 0})` },
            { key: 'brands', label: `Thương hiệu (${brands?.length ?? 0})` },
            { key: 'sizes', label: `Kích thước / Size (${sizes?.length ?? 0})` },
            { key: 'colors', label: `Bảng màu (${colors?.length ?? 0})` },
          ]}
        />

        <SearchBar onSearch={handleSearch}>
          <input
            className="search"
            placeholder={
              tab === 'categories'
                ? 'Tìm kiếm danh mục theo tên hoặc mã…'
                : tab === 'brands'
                  ? 'Tìm kiếm thương hiệu theo tên hoặc mã…'
                  : tab === 'sizes'
                    ? 'Tìm kiếm size/kích cỡ…'
                    : 'Tìm kiếm bảng màu theo tên hoặc mã hex…'
            }
            value={draft.q}
            onChange={set('q')}
          />
          <select
            className="select"
            value={draft.scope}
            onChange={(e) => {
              set('scope')(e);
              setTab(e.target.value as TabKey);
            }}
            aria-label="Phạm vi tìm kiếm"
          >
            <option value="categories">Danh mục</option>
            <option value="brands">Thương hiệu</option>
            <option value="sizes">Kích thước</option>
            <option value="colors">Bảng màu</option>
          </select>
        </SearchBar>

        {tab === 'categories' && (
          <>
            <LoadState
              loading={catLoading}
              error={catError}
              empty={filteredCategories.length === 0}
              emptyText={query ? `Không tìm thấy danh mục nào phù hợp với "${applied.q}"` : 'Chưa có danh mục nào'}
            />
            {filteredCategories.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Mã</th>
                      <th>Tên danh mục</th>
                      <th className="actions-col" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((c: Category) => (
                      <tr key={c.categoryId}>
                        <td>#{c.categoryId}</td>
                        <td><strong>{c.categoryName}</strong></td>
                        <td className="actions">
                          <button className="btn btn--ghost" onClick={() => setModal({ kind: 'categories', item: c })}>Sửa</button>
                          <button className="btn btn--danger" onClick={() => remove('categories', c.categoryId, c.categoryName)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'brands' && (
          <>
            <LoadState
              loading={brLoading}
              error={brError}
              empty={filteredBrands.length === 0}
              emptyText={query ? `Không tìm thấy thương hiệu nào phù hợp với "${applied.q}"` : 'Chưa có thương hiệu nào'}
            />
            {filteredBrands.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Mã</th>
                      <th>Tên thương hiệu</th>
                      <th className="actions-col" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map((b: Brand) => (
                      <tr key={b.brandId}>
                        <td>#{b.brandId}</td>
                        <td><strong>{b.brandName}</strong></td>
                        <td className="actions">
                          <button className="btn btn--ghost" onClick={() => setModal({ kind: 'brands', item: b })}>Sửa</button>
                          <button className="btn btn--danger" onClick={() => remove('brands', b.brandId, b.brandName)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'sizes' && (
          <>
            <LoadState
              loading={szLoading}
              error={szError}
              empty={filteredSizes.length === 0}
              emptyText={query ? `Không tìm thấy kích thước nào phù hợp với "${applied.q}"` : 'Chưa có kích thước nào'}
            />
            {filteredSizes.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Mã</th>
                      <th>Kích cỡ (Size)</th>
                      <th className="num">Thứ tự hiển thị</th>
                      <th className="actions-col" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSizes.map((s: Size) => (
                      <tr key={s.sizeId}>
                        <td>#{s.sizeId}</td>
                        <td><span className="badge badge--ok">{s.sizeLabel}</span></td>
                        <td className="num">{s.sortOrder}</td>
                        <td className="actions">
                          <button className="btn btn--ghost" onClick={() => setModal({ kind: 'sizes', item: s })}>Sửa</button>
                          <button className="btn btn--danger" onClick={() => remove('sizes', s.sizeId, s.sizeLabel)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === 'colors' && (
          <>
            <LoadState
              loading={colLoading}
              error={colError}
              empty={filteredColors.length === 0}
              emptyText={query ? `Không tìm thấy màu sắc nào phù hợp với "${applied.q}"` : 'Chưa có màu sắc nào'}
            />
            {filteredColors.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Mã</th>
                      <th>Tên màu</th>
                      <th>Mã HEX (#RRGGBB)</th>
                      <th>Mẫu hiển thị</th>
                      <th className="actions-col" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredColors.map((c: Color) => (
                      <tr key={c.colorId}>
                        <td>#{c.colorId}</td>
                        <td><strong>{c.colorName}</strong></td>
                        <td><code>{c.hexCode ?? '—'}</code></td>
                        <td><ColorDot hex={c.hexCode} name="" /></td>
                        <td className="actions">
                          <button className="btn btn--ghost" onClick={() => setModal({ kind: 'colors', item: c })}>Sửa</button>
                          <button className="btn btn--danger" onClick={() => remove('colors', c.colorId, c.colorName)}>Xóa</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <CatalogItemModal
          kind={modal.kind}
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            reloadCurrent();
          }}
        />
      )}
    </>
  );
}

interface ItemModalProps {
  kind: TabKey;
  item?: any;
  onClose: () => void;
  onSaved: () => void;
}

function CatalogItemModal({ kind, item, onClose, onSaved }: ItemModalProps) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.categoryName || item?.brandName || item?.sizeLabel || item?.colorName || '');
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [hexCode, setHexCode] = useState(item?.hexCode || '#000000');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const title = `${isEdit ? 'Sửa' : 'Thêm'} ${kind === 'categories' ? 'danh mục' : kind === 'brands' ? 'thương hiệu' : kind === 'sizes' ? 'kích cỡ (size)' : 'màu sắc'
    }`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Vui lòng nhập tên / nhãn');
    if (kind === 'colors') {
      const err = validateHex(hexCode);
      if (err) return setError(err);
    }
    setError('');
    setSaving(true);
    try {
      let payload: any = {};
      let id = 0;
      if (kind === 'categories') {
        payload = { categoryName: name.trim() };
        id = item?.categoryId;
      } else if (kind === 'brands') {
        payload = { brandName: name.trim() };
        id = item?.brandId;
      } else if (kind === 'sizes') {
        payload = { sizeLabel: name.trim(), sortOrder: Number(sortOrder) || 0 };
        id = item?.sizeId;
      } else if (kind === 'colors') {
        payload = { colorName: name.trim(), hexCode: hexCode.toUpperCase() };
        id = item?.colorId;
      }

      if (isEdit) {
        await catalogService.update(kind, id, payload);
      } else {
        await catalogService.create(kind, payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form" noValidate>
        <label className="field">
          <span>{kind === 'sizes' ? 'Nhãn kích cỡ (ví dụ 39, 40, 41) *' : 'Tên gọi *'}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>

        {kind === 'sizes' && (
          <label className="field">
            <span>Thứ tự sắp xếp</span>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
        )}

        {kind === 'colors' && (
          <div className="field">
            <span>Mã màu HEX *</span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="color"
                value={hexCode.startsWith('#') && hexCode.length === 7 ? hexCode : '#000000'}
                onChange={(e) => setHexCode(e.target.value.toUpperCase())}
                style={{ width: 48, height: 40, padding: 2, cursor: 'pointer' }}
              />
              <input
                value={hexCode}
                onChange={(e) => setHexCode(e.target.value.trim().toUpperCase())}
                placeholder="#RRGGBB"
                style={{ flex: 1 }}
              />
            </div>
            <p className="muted small">Mã màu bắt đầu bằng dấu # và 6 ký tự hex (ví dụ: #FFFFFF, #000000).</p>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
