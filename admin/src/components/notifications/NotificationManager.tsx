import React, { useEffect, useState } from 'react';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { Modal } from '../common/Modal';
import { LoadState } from '../common/Widgets';
import { Pagination } from '../tables/Pagination';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { useAsync } from '../../utils/useAsync';
import { getErrorMessage } from '../../utils/error';
import { notificationService } from '../../services/notification.service';
import { customerService } from '../../services/customer.service';
import { EMPTY_FILTERS as EMPTY_CUSTOMER_FILTERS } from '../../utils/customerSearch';
import type { CustomerListItem } from '../../types/customer';
import type {
  CreateNotificationInput,
  NotificationDetail,
  NotificationFilters,
  NotificationItem,
  NotificationType,
} from '../../types/notification';

const SIZE = 10;
const EMPTY_FILTERS: NotificationFilters = { q: '', type: '' };

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; badgeClass: string; bg: string; color: string }
> = {
  SYSTEM: {
    label: 'Hệ thống',
    badgeClass: 'badge--system',
    bg: '#E0F2FE',
    color: '#0369A1',
  },
  PROMOTION: {
    label: 'Khuyến mãi',
    badgeClass: 'badge--promo',
    bg: '#F3E8FF',
    color: '#7E22CE',
  },
  ORDER: {
    label: 'Đơn hàng',
    badgeClass: 'badge--order',
    bg: '#FEE2E2',
    color: '#B91C1C',
  },
  OTHER: {
    label: 'Khác',
    badgeClass: 'badge--other',
    bg: '#F3F4F6',
    color: '#4B5563',
  },
};

export function NotificationManager() {
  const { draft, applied, page, setPage, set, apply } =
    useSearchFilters<NotificationFilters>(EMPTY_FILTERS);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<NotificationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [notifType, setNotifType] = useState<NotificationType>('SYSTEM');
  const [targetType, setTargetType] = useState<'ALL' | 'SELECTED'>('ALL');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<CustomerListItem[]>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () =>
      notificationService.list({
        page,
        size: SIZE,
        search: applied.q.trim() || undefined,
        type: applied.type || undefined,
      }),
    [applied, page],
  );

  // Load customers for picker when targetType is SELECTED
  useEffect(() => {
    if (createModalOpen && targetType === 'SELECTED') {
      setCustomerLoading(true);
      customerService
        .list({ ...EMPTY_CUSTOMER_FILTERS, q: customerSearch }, 1, 30)
        .then((res) => setCustomerList(res.items))
        .catch(() => {})
        .finally(() => setCustomerLoading(false));
    }
  }, [createModalOpen, targetType, customerSearch]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setNotifType('SYSTEM');
    setTargetType('ALL');
    setLinkUrl('');
    setSelectedCustomerIds([]);
    setCustomerSearch('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      window.alert('Vui lòng nhập tiêu đề thông báo');
      return;
    }
    if (!content.trim()) {
      window.alert('Vui lòng nhập nội dung thông báo');
      return;
    }
    if (targetType === 'SELECTED' && selectedCustomerIds.length === 0) {
      window.alert('Vui lòng chọn ít nhất một khách hàng nhận thông báo');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateNotificationInput = {
        title: title.trim(),
        content: content.trim(),
        notificationType: notifType,
        targetType,
        linkUrl: linkUrl.trim() || null,
        customerIds: targetType === 'SELECTED' ? selectedCustomerIds : undefined,
      };
      await notificationService.create(payload);
      setCreateModalOpen(false);
      resetForm();
      await reload();
      window.alert('Đã gửi thông báo thành công!');
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = async (item: NotificationItem) => {
    setDetailLoading(true);
    setDetailModalItem(item);
    try {
      const detail = await notificationService.getById(item.notificationId);
      setDetailModalItem(detail);
    } catch (err) {
      window.alert(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (item: NotificationItem) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa thông báo "${item.title}"? Thao tác này sẽ ẩn thông báo khỏi hệ thống.`,
      )
    ) {
      return;
    }
    try {
      await notificationService.remove(item.notificationId);
      await reload();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  };

  const toggleCustomer = (cid: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid],
    );
  };

  return (
    <>
      <PageHeader
        title="Quản lý Thông báo"
        actions={
          <button className="btn btn--primary" onClick={handleOpenCreate}>
            + Soạn thông báo
          </button>
        }
      />

      {/* Bộ lọc tìm kiếm & loại thông báo */}
      <div className="card" style={{ marginBottom: 16 }}>
        <SearchBar onSearch={apply}>
          <input
            className="search"
            placeholder="Tìm theo tiêu đề hoặc nội dung thông báo…"
            value={draft.q}
            onChange={set('q')}
            style={{ flex: 2 }}
          />
          <select
            className="search-select"
            value={draft.type}
            onChange={set('type')}
            style={{ flex: 1, minWidth: 160 }}
          >
            <option value="">Tất cả loại thông báo</option>
            <option value="SYSTEM">Hệ thống (SYSTEM)</option>
            <option value="PROMOTION">Khuyến mãi (PROMOTION)</option>
            <option value="ORDER">Đơn hàng (ORDER)</option>
            <option value="OTHER">Khác (OTHER)</option>
          </select>
        </SearchBar>
      </div>

      {/* Bảng danh sách thông báo */}
      <div className="card">
        <LoadState
          loading={loading}
          error={error}
          empty={!loading && !error && (!data || data.items.length === 0)}
          emptyText="Không có thông báo nào phù hợp."
        />
        {!loading && !error && data && data.items.length > 0 && (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>#ID</th>
                    <th>Tiêu đề & Nội dung</th>
                    <th style={{ width: 130 }}>Loại</th>
                    <th style={{ width: 140 }}>Đối tượng</th>
                    <th style={{ width: 140 }}>Đã đọc / Đã gửi</th>
                    <th style={{ width: 160 }}>Người tạo</th>
                    <th style={{ width: 160 }}>Thời gian gửi</th>
                    <th style={{ width: 130, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => {
                    const typeInfo = TYPE_CONFIG[item.notificationType] || TYPE_CONFIG.OTHER;
                    const readPct =
                      item.totalRecipients > 0
                        ? Math.round((item.readCount / item.totalRecipients) * 100)
                        : 0;

                    return (
                      <tr key={item.notificationId}>
                        <td style={{ fontWeight: 600, color: '#6B7280' }}>
                          #{item.notificationId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: '#6B7280',
                              maxWidth: 320,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.content}
                          </div>
                          {item.linkUrl && (
                            <div style={{ fontSize: 11, color: '#2563EB', marginTop: 2 }}>
                              🔗 {item.linkUrl}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: typeInfo.bg,
                              color: typeInfo.color,
                            }}
                          >
                            {typeInfo.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 13 }}>
                            {item.targetType === 'ALL' ? (
                              <strong style={{ color: '#059669' }}>🌐 Tất cả khách</strong>
                            ) : (
                              <strong style={{ color: '#4B5563' }}>🎯 Chọn lọc</strong>
                            )}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {item.readCount} / {item.totalRecipients} ({readPct}%)
                          </div>
                          <div
                            style={{
                              width: '100%',
                              height: 5,
                              backgroundColor: '#E5E7EB',
                              borderRadius: 3,
                              marginTop: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${readPct}%`,
                                height: '100%',
                                backgroundColor: readPct > 50 ? '#10B981' : '#3B82F6',
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: '#374151' }}>
                          {item.createdByName || `NV #${item.createdBy}`}
                        </td>
                        <td style={{ fontSize: 13, color: '#6B7280' }}>
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn--sm btn--subtle"
                            onClick={() => handleOpenDetail(item)}
                            title="Xem chi tiết"
                            style={{ marginRight: 6 }}
                          >
                            👁
                          </button>
                          <button
                            className="btn btn--sm btn--danger-subtle"
                            onClick={() => handleDelete(item)}
                            title="Xóa thông báo"
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div style={{ marginTop: 16 }}>
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  total={data.total}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Soạn & Gửi thông báo */}
      {createModalOpen && (
        <Modal title="Soạn và gửi thông báo mới" onClose={() => setCreateModalOpen(false)} wide>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>
                  Tiêu đề thông báo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: Giảm giá mùa hè 20% toàn bộ giày chạy bộ!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={150}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>
                    Loại thông báo
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={notifType}
                    onChange={(e) => setNotifType(e.target.value as NotificationType)}
                  >
                    <option value="SYSTEM">Hệ thống (SYSTEM)</option>
                    <option value="PROMOTION">Khuyến mãi (PROMOTION)</option>
                    <option value="ORDER">Đơn hàng (ORDER)</option>
                    <option value="OTHER">Khác (OTHER)</option>
                  </select>
                </div>

                <div>
                  <label className="label" style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>
                    Đối tượng nhận
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as 'ALL' | 'SELECTED')}
                  >
                    <option value="ALL">Tất cả khách hàng (ALL)</option>
                    <option value="SELECTED">Chọn danh sách khách hàng (SELECTED)</option>
                  </select>
                </div>
              </div>

              {/* Bộ chọn khách hàng nếu targetType === SELECTED */}
              {targetType === 'SELECTED' && (
                <div
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: '#F9FAFB',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      Chọn khách hàng nhận thông báo (Đã chọn: {selectedCustomerIds.length})
                    </span>
                    {selectedCustomerIds.length > 0 && (
                      <button
                        type="button"
                        className="btn btn--sm btn--subtle"
                        onClick={() => setSelectedCustomerIds([])}
                      >
                        Bỏ chọn tất cả
                      </button>
                    )}
                  </div>

                  <input
                    className="input"
                    style={{ width: '100%', marginBottom: 8 }}
                    placeholder="Tìm nhanh khách hàng theo tên hoặc SĐT…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />

                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {customerLoading ? (
                      <div style={{ padding: 12, textAlign: 'center', color: '#6B7280' }}>
                        Đang tải danh sách khách hàng…
                      </div>
                    ) : customerList.length === 0 ? (
                      <div style={{ padding: 12, textAlign: 'center', color: '#6B7280' }}>
                        Không tìm thấy khách hàng.
                      </div>
                    ) : (
                      customerList.map((c) => {
                        const checked = selectedCustomerIds.includes(c.customerId);
                        return (
                          <label
                            key={c.customerId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '8px 12px',
                              borderBottom: '1px solid #F3F4F6',
                              cursor: 'pointer',
                              backgroundColor: checked ? '#F0F9FF' : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCustomer(c.customerId)}
                            />
                            <div style={{ flex: 1, fontSize: 13 }}>
                              <strong>{c.fullName}</strong>
                              {c.phone && <span style={{ color: '#6B7280' }}> • {c.phone}</span>}
                              {c.email && <span style={{ color: '#9CA3AF' }}> • {c.email}</span>}
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="label" style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>
                  Đường dẫn liên kết (tùy chọn)
                </label>
                <input
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Ví dụ: /orders/102 hoặc /promotions"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="label" style={{ fontWeight: 600, marginBottom: 4, display: 'block' }}>
                  Nội dung thông báo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  className="textarea"
                  style={{ width: '100%', minHeight: 120, padding: 10, borderRadius: 6 }}
                  placeholder="Nhập nội dung chi tiết của thông báo…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
                marginTop: 20,
                paddingTop: 12,
                borderTop: '1px solid #E5E7EB',
              }}
            >
              <button
                type="button"
                className="btn btn--subtle"
                onClick={() => setCreateModalOpen(false)}
                disabled={submitting}
              >
                Hủy bỏ
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Đang gửi…' : '🚀 Gửi thông báo ngay'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Chi tiết thông báo */}
      {detailModalItem && (
        <Modal
          title={`Chi tiết thông báo #${detailModalItem.notificationId}`}
          onClose={() => setDetailModalItem(null)}
          wide
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                padding: 16,
                backgroundColor: '#F9FAFB',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: 17, color: '#111827' }}>
                  {detailModalItem.title}
                </h3>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor:
                      TYPE_CONFIG[detailModalItem.notificationType]?.bg || '#F3F4F6',
                    color:
                      TYPE_CONFIG[detailModalItem.notificationType]?.color || '#4B5563',
                  }}
                >
                  {TYPE_CONFIG[detailModalItem.notificationType]?.label || detailModalItem.notificationType}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#374151',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {detailModalItem.content}
              </div>

              {detailModalItem.linkUrl && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#2563EB' }}>
                  🔗 Đường dẫn điều hướng: <strong>{detailModalItem.linkUrl}</strong>
                </div>
              )}

              <div
                style={{
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  gap: 20,
                  fontSize: 13,
                  color: '#6B7280',
                }}
              >
                <div>
                  👤 Người tạo: <strong>{detailModalItem.createdByName}</strong>
                </div>
                <div>
                  📅 Thời gian:{' '}
                  <strong>{new Date(detailModalItem.createdAt).toLocaleString('vi-VN')}</strong>
                </div>
                <div>
                  🎯 Đối tượng:{' '}
                  <strong>
                    {detailModalItem.targetType === 'ALL' ? 'Tất cả khách' : 'Chọn lọc'}
                  </strong>
                </div>
                <div>
                  📊 Tỷ lệ đọc:{' '}
                  <strong style={{ color: '#059669' }}>
                    {detailModalItem.readCount} / {detailModalItem.totalRecipients}
                  </strong>
                </div>
              </div>
            </div>

            {/* Danh sách người nhận */}
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, color: '#374151' }}>
                Danh sách người nhận (Hiển thị tối đa 100 người):
              </h4>
              {detailLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#6B7280' }}>
                  Đang tải danh sách người nhận…
                </div>
              ) : !detailModalItem.recipients || detailModalItem.recipients.length === 0 ? (
                <div style={{ padding: 16, color: '#6B7280', fontStyle: 'italic' }}>
                  Chưa có thông tin người nhận.
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: 250,
                    overflowY: 'auto',
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                  }}
                >
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Khách hàng</th>
                        <th>Số điện thoại</th>
                        <th>Trạng thái</th>
                        <th>Thời gian đọc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailModalItem.recipients.map((r) => (
                        <tr key={r.customerId}>
                          <td>{r.customerName}</td>
                          <td>{r.customerPhone || '—'}</td>
                          <td>
                            {r.isRead ? (
                              <span style={{ color: '#059669', fontWeight: 600 }}>✓ Đã đọc</span>
                            ) : (
                              <span style={{ color: '#9CA3AF' }}>• Chưa đọc</span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: '#6B7280' }}>
                            {r.readAt ? new Date(r.readAt).toLocaleString('vi-VN') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn btn--subtle" onClick={() => setDetailModalItem(null)}>
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
