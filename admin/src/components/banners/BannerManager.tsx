import { useCallback, useEffect, useState } from 'react';
import { bannerService } from '../../services/banner.service';
import type { Banner } from '../../types/banner';
import { getErrorMessage } from '../../utils/error';
import { BannerFormModal } from './BannerFormModal';

export function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);

  const loadBanners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bannerService.list({
        platform: 'MOBILE',
        isActive: statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : undefined,
      });
      setBanners(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  async function handleToggleActive(b: Banner) {
    try {
      await bannerService.update(b.bannerId, { isActive: !b.isActive });
      await loadBanners();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  async function handleDelete(b: Banner) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa banner "${b.title}"?`)) return;
    try {
      await bannerService.remove(b.bannerId);
      await loadBanners();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  const resolveImage = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `http://localhost:5000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Quản Lý Banner
          </h1>
        </div>

        <button
          onClick={() => {
            setEditingBanner(undefined);
            setModalOpen(true);
          }}
          style={{
            backgroundColor: '#0bb062',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(11, 176, 98, 0.2)',
          }}
        >
          Thêm Banner Mới
        </button>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="INACTIVE">Đang ẩn</option>
          </select>
        </div>

        <button
          onClick={loadBanners}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#f8fafc',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            color: '#475569',
          }}
        >
          Làm mới
        </button>
      </div>

      {/* Main Content */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          <div>Đang tải danh sách banner...</div>
        </div>
      ) : banners.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '6px' }}>
            Chưa có banner nào
          </h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
            Nhấn "Thêm Banner Mới" để tải ảnh banner hiển thị trên ứng dụng.
          </p>
          <button
            onClick={() => {
              setEditingBanner(undefined);
              setModalOpen(true);
            }}
            style={{
              backgroundColor: '#0bb062',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Thêm Banner Đầu Tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {banners.map((b) => {
            const imgSrc = resolveImage(b.imageUrl);
            return (
              <div
                key={b.bannerId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Image Box */}
                <div style={{ width: '100%', height: '170px', backgroundColor: '#f1f5f9', position: 'relative' }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={b.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      Không có ảnh
                    </div>
                  )}

                  {/* Status Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      backgroundColor: b.isActive ? '#ecfdf5' : '#fef2f2',
                      color: b.isActive ? '#059669' : '#dc2626',
                      border: `1px solid ${b.isActive ? '#a7f3d0' : '#fecaca'}`,
                    }}
                  >
                    {b.isActive ? 'Đang hiển thị' : 'Đã ẩn'}
                  </span>
                </div>

                {/* Content Info */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#0f172a',
                      margin: '0 0 8px 0',
                      lineHeight: '1.4',
                    }}
                  >
                    {b.title}
                  </h3>

                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                    <div>
                      <strong>Thứ tự hiển thị:</strong> {b.sortOrder}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => handleToggleActive(b)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        color: b.isActive ? '#64748b' : '#059669',
                      }}
                    >
                      {b.isActive ? 'Ẩn banner' : 'Hiện banner'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingBanner(b);
                        setModalOpen(true);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '6px',
                        border: '1px solid #0bb062',
                        backgroundColor: '#f0fdf4',
                        color: '#058a46',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Sửa
                    </button>

                    <button
                      onClick={() => handleDelete(b)}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <BannerFormModal
          banner={editingBanner}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            loadBanners();
          }}
        />
      )}
    </div>
  );
}
