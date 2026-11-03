import { type ChangeEvent, type FormEvent, useRef, useState, useMemo } from 'react';
import { api } from '../../services/api';
import { catalogService, productService } from '../../services/product.service';
import { supplierService } from '../../services/inventory.service';
import type { Brand, Category, ProductDetail } from '../../types/product';
import type { Supplier } from '../../types/inventory';
import type { Paged } from '../../types/customer';
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

export function ProductFormModal({ product, onClose, onSaved }: Props) {
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    productName: product?.productName ?? '',
    categoryId: String(product?.categoryId ?? ''),
    brandId: String(product?.brandId ?? ''),
    supplierId: String(product?.supplierId ?? ''),
    currentPrice: String(product?.currentPrice ?? ''),
    unit: product?.unit ?? 'Đôi',
    description: product?.description ?? '',
    imageUrl: product?.imageUrl ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useAsync<Category[]>(() => catalogService.list('categories'), []);
  const { data: brands } = useAsync<Brand[]>(() => catalogService.list('brands'), []);
  const { data: suppliers } = useAsync<Paged<Supplier>>(() => supplierService.list({ page: 1, size: 100 }), []);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const imageUrls = useMemo(() => {
    return f.imageUrl
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  }, [f.imageUrl]);

  function removeImage(idx: number) {
    const next = imageUrls.filter((_, i) => i !== idx);
    setF((prev) => ({ ...prev, imageUrl: next.join(', ') }));
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setError(`Tệp ${file.name} vượt quá dung lượng 5MB`);
          continue;
        }

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Lỗi đọc tệp từ thiết bị'));
          reader.readAsDataURL(file);
        });

        const { data } = await api.post<{ url: string }>('/uploads', {
          filename: file.name,
          data: dataUrl,
        });
        uploadedUrls.push(data.url);
      }

      if (uploadedUrls.length > 0) {
        setF((prev) => {
          const currentUrls = prev.imageUrl
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean);
          const newUrls = [...currentUrls, ...uploadedUrls];
          return { ...prev, imageUrl: newUrls.join(', ') };
        });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function validate(): string {
    if (!f.productName.trim()) return 'Vui lòng nhập tên sản phẩm';
    const price = Number(f.currentPrice);
    if (!Number.isFinite(price) || price < 0) return 'Giá sản phẩm không được âm';
    if (!f.unit.trim()) return 'Vui lòng nhập đơn vị tính';
    if (f.imageUrl.trim()) {
      const urls = f.imageUrl.split(',').map((u) => u.trim()).filter(Boolean);
      for (const u of urls) {
        const imgErr = validateImageUrl(u);
        if (imgErr) return imgErr;
      }
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
      description: f.description.trim() || undefined,
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
            <span>Danh mục</span>
            <select className="select" value={f.categoryId} onChange={set('categoryId')}>
              <option value="">Chưa phân loại</option>
              {categories?.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Thương hiệu</span>
            <select className="select" value={f.brandId} onChange={set('brandId')}>
              <option value="">Chưa có thương hiệu</option>
              {brands?.map((b) => (
                <option key={b.brandId} value={b.brandId}>{b.brandName}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Nhà cung cấp</span>
            <select className="select" value={f.supplierId} onChange={set('supplierId')}>
              <option value="">Chưa gắn NCC</option>
              {suppliers?.items.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Giá niêm yết (VND) *</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={f.currentPrice}
              onChange={set('currentPrice')}
              placeholder="VD: 1500000"
            />
          </label>

          <label className="field">
            <span>Đơn vị tính *</span>
            <input value={f.unit} onChange={set('unit')} placeholder="Đôi" />
          </label>

          <div className="field span-2">
            <span>Hình ảnh sản phẩm (hỗ trợ nhiều ảnh)</span>
            <div style={{ display: 'flex', gap: 14, flexDirection: 'column', marginTop: 4 }}>
              {imageUrls.length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {imageUrls.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', border: '1px solid #e2e8f0', borderRadius: 8, padding: 2 }}>
                      <Thumb src={url} alt={`Ảnh ${idx + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: 20,
                          height: 20,
                          fontSize: 12,
                          lineHeight: '20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}
                        title="Xóa ảnh này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
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
                    {uploading ? 'Đang tải ảnh lên…' : '+ Tải ảnh từ máy tính (chọn 1 hoặc nhiều ảnh)'}
                  </button>
                  {imageUrls.length > 0 && (
                    <button
                      type="button"
                      className="btn btn--ghost small"
                      onClick={() => setF((prev) => ({ ...prev, imageUrl: '' }))}
                    >
                      Xóa tất cả ảnh
                    </button>
                  )}
                </div>
                <input
                  value={f.imageUrl}
                  onChange={set('imageUrl')}
                  placeholder="Hoặc dán các link URL ảnh cách nhau bởi dấu phẩy (https://..., https://...)"
                />
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 4 }}>
              Hỗ trợ tải nhiều ảnh (.png, .jpg, .webp, tối đa 5MB/ảnh). Ảnh đầu tiên sẽ là ảnh đại diện hiển thị ở danh sách sản phẩm.
            </p>
          </div>

          <label className="field span-2">
            <span>Mô tả sản phẩm</span>
            <textarea className="textarea" rows={3} value={f.description} onChange={set('description')} />
          </label>
        </div>

        {isEdit && (
          <p className="muted small" style={{ marginTop: 8 }}>
            Để quản lý biến thể (size, màu, tồn kho), mở trang <strong>Chi tiết sản phẩm</strong>.
          </p>
        )}

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Hủy</button>
          <button type="submit" className="btn btn--primary" disabled={saving || uploading}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
