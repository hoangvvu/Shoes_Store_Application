import { type ChangeEvent, type FormEvent, useRef, useState } from 'react';
import { api } from '../../services/api';
import { bannerService } from '../../services/banner.service';
import type { Banner, BannerFormValues } from '../../types/banner';
import { getErrorMessage } from '../../utils/error';
import { Modal } from '../common/Modal';

interface Props {
  banner?: Banner;
  onClose: () => void;
  onSaved: () => void;
}

export function BannerFormModal({ banner, onClose, onSaved }: Props) {
  const isEdit = !!banner;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [f, setF] = useState({
    title: banner?.title ?? '',
    imageUrl: banner?.imageUrl ?? '',
    sortOrder: banner?.sortOrder ?? 0,
    isActive: banner?.isActive ?? true,
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((s) => ({ ...s, [k]: val }));
  };

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
        setF((s) => ({ ...s, imageUrl: data.url }));
      } catch (err) {
        setError(getErrorMessage(err) || 'Tải ảnh lên máy chủ thất bại');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.title.trim()) {
      setError('Vui lòng nhập tiêu đề banner');
      return;
    }
    if (!f.imageUrl.trim()) {
      setError('Vui lòng tải lên ảnh hoặc nhập URL ảnh banner');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload: BannerFormValues = {
        title: f.title.trim(),
        imageUrl: f.imageUrl.trim(),
        linkUrl: null,
        position: 'HOME_TOP',
        platform: 'MOBILE',
        sortOrder: Number(f.sortOrder) || 0,
        isActive: f.isActive,
      };

      if (isEdit && banner) {
        await bannerService.update(banner.bannerId, payload);
      } else {
        await bannerService.create(payload);
      }

      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = f.imageUrl
    ? f.imageUrl.startsWith('http')
      ? f.imageUrl
      : `http://localhost:5000${f.imageUrl.startsWith('/') ? '' : '/'}${f.imageUrl}`
    : '';

  return (
    <Modal title={isEdit ? `Sửa Banner #${banner?.bannerId}` : 'Thêm Banner mới'} onClose={onClose}>
      <form onSubmit={submit} className="banner-form-modal">
        {error && <div className="banner-form-error">{error}</div>}

        <div className="banner-form-group">
          <label className="banner-form-label">
            Tiêu đề Banner <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            className="banner-form-input"
            value={f.title}
            onChange={set('title')}
            placeholder="Ví dụ: Flash Sale Giày Chạy Flyte-Run X1 Giảm 50%"
            required
          />
        </div>

        {/* Upload Ảnh */}
        <div className="banner-form-group">
          <label className="banner-form-label">
            Ảnh Banner <span style={{ color: '#ef4444' }}>*</span>
          </label>

          <div style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="banner-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Đang tải ảnh...' : 'Tải ảnh từ máy tính'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          <input
            type="text"
            className="banner-form-input"
            value={f.imageUrl}
            onChange={set('imageUrl')}
            placeholder="/uploads/banner.jpg hoặc https://example.com/banner.jpg"
            required
          />

          {/* Preview Ảnh */}
          {previewSrc && (
            <div className="banner-preview-box" style={{ marginTop: 8 }}>
              <img
                src={previewSrc}
                alt="Banner Preview"
                style={{
                  width: '100%',
                  maxHeight: 180,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  display: 'block',
                }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Thứ tự ưu tiên */}
        <div className="banner-form-group">
          <label className="banner-form-label">Thứ tự ưu tiên</label>
          <input
            type="number"
            className="banner-form-input"
            value={f.sortOrder}
            onChange={set('sortOrder')}
            min={0}
          />
        </div>

        {/* Trạng thái hiển thị */}
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="banner-is-active"
            checked={f.isActive}
            onChange={set('isActive')}
            style={{ width: 18, height: 18, accentColor: '#0bb062', cursor: 'pointer' }}
          />
          <label htmlFor="banner-is-active" style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
            Kích hoạt hiển thị banner trên ứng dụng
          </label>
        </div>

        <div className="banner-form-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button type="submit" className="btn-primary" disabled={saving || uploading} style={{ backgroundColor: '#0bb062' }}>
            {saving ? 'Đang lưu...' : isEdit ? 'Cập nhật Banner' : 'Tạo Banner'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
