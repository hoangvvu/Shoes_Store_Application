import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { api } from '../../services/api';
import { catalogService, productService } from '../../services/product.service';
import { supplierService } from '../../services/inventory.service';
import type { Supplier } from '../../types/inventory';
import type { Brand, Category, ProductDetail } from '../../types/product';
import { getErrorMessage } from '../../utils/error';
import { useAsync } from '../../utils/useAsync';
import { validateImageUrl } from '../../utils/validators';
import { Modal } from '../common/Modal';
import { Thumb } from '../common/Widgets';

interface Props {
  product?: ProductDetail;
  onClose: () => void;
  onSaved: () => void;
}

/** Thêm/sửa sản phẩm. Kiểm tra giá không âm, hỗ trợ tải ảnh từ máy tính hoặc URL. */
export function ProductFormModal({ product, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    productName: product?.productName ?? '',
    categoryId: product?.categoryId ? String(product.categoryId) : '',
    brandId: product?.brandId ? String(product.brandId) : '',
    supplierId: product?.supplierId ? String(product.supplierId) : '',
    currentPrice: String(product?.currentPrice ?? 0),
    unit: product?.unit ?? 'Đôi',
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useAsync(() => catalogService.list('categories'), []);
  const { data: brands } = useAsync(() => catalogService.list('brands'), []);
  const { data: suppliers } = useAsync(() => supplierService.list({ page: 1, size: 100 }), []);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước tệp ảnh không được vượt quá 5MB');
      return;
    }

    setUploading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { data } = await api.post<{ url: string }>('/uploads', {
          filename: file.name,
          data: reader.result,
        });
        setF((prev) => ({ ...prev, imageUrl: data.url }));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError('Lỗi đọc tệp từ thiết bị');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function validate(): string {
    if (!f.productName.trim()) return 'Vui lòng nhập tên sản phẩm';
    const price = Number(f.currentPrice);
    if (!Number.isFinite(price) || price < 0) return 'Giá sản phẩm không được âm';
    if (!f.unit.trim()) return 'Vui lòng nhập đơn vị tính';
    if (f.imageUrl.trim()) {
      const imgErr = validateImageUrl(f.imageUrl);
      if (imgErr) return imgErr;
    }
    return '';
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const msg = validate();
    if (msg) return setError(msg);
    setError('');
    setSaving(true);
    const payload = {
      productName: f.productName.trim(),
      categoryId: f.categoryId ? Number(f.categoryId) : null,
      brandId: f.brandId ? Number(f.brandId) : null,
      supplierId: f.supplierId ? Number(f.supplierId) : null,
      currentPrice: Number(f.currentPrice),
      unit: f.unit.trim(),
      description: f.description.trim() || '',
      imageUrl: f.imageUrl.trim() || '',
    };
    try {
      if (isEdit) await productService.update(product.productId, payload);
      else await productService.create(payload as any);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'} onClose={onClose} wide>
      <form onSubmit={submit} className="form" noValidate>
        <div className="form-grid">
          <label className="field span-2">
            <span>Tên sản phẩm *</span>
            <input value={f.productName} onChange={set('productName')} autoFocus />
          </label>

          <label className="field">
            <span>Nhà cung cấp đối tác</span>
            <select className="select" value={f.supplierId} onChange={set('supplierId')}>
              <option value="">-- Chọn nhà cung cấp --</option>
              {suppliers?.items.map((s: Supplier) => (
                <option key={s.supplierId} value={s.supplierId}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Danh mục</span>
            <select className="select" value={f.categoryId} onChange={set('categoryId')}>
              <option value="">-- Chọn danh mục --</option>
              {categories?.map((c: Category) => (
                <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Thương hiệu (Hãng)</span>
            <select className="select" value={f.brandId} onChange={set('brandId')}>
              <option value="">-- Chọn thương hiệu --</option>
              {brands?.map((b: Brand) => (
                <option key={b.brandId} value={b.brandId}>{b.brandName}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Giá hiện hành (VND) *</span>
            <input type="number" min={0} step={10000} value={f.currentPrice} onChange={set('currentPrice')} />
          </label>

          <label className="field">
            <span>Đơn vị tính *</span>
            <input value={f.unit} onChange={set('unit')} placeholder="Đôi, Chiếc..." />
          </label>

          <div className="field span-2">
            <span>Hình ảnh sản phẩm</span>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 4 }}>
              <Thumb src={f.imageUrl || null} alt="Xem trước" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Đang tải ảnh lên…' : 'Tải ảnh từ máy tính'}
                  </button>
                  {f.imageUrl && (
                    <button
                      type="button"
                      className="btn btn--ghost small"
                      onClick={() => setF((prev) => ({ ...prev, imageUrl: '' }))}
                    >
                      Xóa ảnh
                    </button>
                  )}
                </div>
                <input
                  value={f.imageUrl}
                  onChange={set('imageUrl')}
                  placeholder="Hoặc dán đường link URL ảnh (https://...)"
                />
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 4 }}>
              Hỗ trợ tải trực tiếp tệp ảnh (.png, .jpg, .webp, tối đa 5MB) từ thiết bị hoặc dán liên kết URL ảnh ngoài.
            </p>
          </div>

          <label className="field span-2">
            <span>Mô tả sản phẩm</span>
            <textarea className="textarea" rows={3} value={f.description} onChange={set('description')} />
          </label>
        </div>

        {isEdit && (
          <p className="muted small">
            Thay đổi giá sẽ được hệ thống tự động ghi nhật ký audit (<code>PRODUCT_PRICE_CHANGE</code>). Các đơn hàng cũ đã đặt vẫn giữ nguyên giá tại thời điểm đặt.
          </p>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </Modal>
  );
}
