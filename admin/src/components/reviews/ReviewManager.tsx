import { useCallback, useEffect, useState } from 'react';
import { reviewService } from '../../services/review.service';
import type { Paged } from '../../types/customer';
import type { ModerationReview, ReviewStatus } from '../../types/review';
import { useSearchFilters } from '../../hooks/useSearchFilters';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime } from '../../utils/format';
import { PageHeader } from '../common/PageHeader';
import { SearchBar } from '../common/SearchBar';
import { Pagination } from '../tables/Pagination';
import { ReviewReplyModal } from './ReviewReplyModal';
import { StarRating } from './StarRating';

const SIZE = 8;

interface Filters {
  q: string;
  status: string;
  rating: string;
}
const EMPTY: Filters = { q: '', status: '', rating: '' };
const STATUS_LABEL: Record<ReviewStatus, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đang hiển thị', HIDDEN: 'Đã ẩn' };

/** Kiểm duyệt đánh giá + phản hồi; dùng chung cho Admin và Bán hàng (chỉ Admin được xóa). */
export function ReviewManager({ canDelete }: { canDelete: boolean }) {
  // Bộ lọc chỉ có hiệu lực khi bấm "Tìm kiếm"; tất cả về mặc định thì tự về danh sách đầy đủ
  const { draft, applied, page, setPage, set, apply, pending } = useSearchFilters<Filters>(EMPTY);
  const [data, setData] = useState<Paged<ModerationReview> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyId, setReplyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await reviewService.list({ status: (applied.status || undefined) as ReviewStatus | undefined, rating: applied.rating ? Number(applied.rating) : undefined, q: applied.q.trim(), page, size: SIZE }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  async function changeStatus(r: ModerationReview, next: ReviewStatus) {
    try {
      await reviewService.setStatus(r.reviewId, next);
      await load();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  async function remove(r: ModerationReview) {
    if (!window.confirm(`Xóa đánh giá của "${r.customerName}"? (xóa mềm, dùng cho đánh giá vi phạm)`)) return;
    try {
      await reviewService.remove(r.reviewId);
      await load();
    } catch (err) {
      window.alert(getErrorMessage(err));
    }
  }

  const search = apply;
  const active = data?.items.find((r) => r.reviewId === replyId) ?? null;

  return (
    <>
      <PageHeader title="Đánh giá sản phẩm" subtitle="Duyệt, ẩn và phản hồi đánh giá của khách hàng. Đánh giá bị ẩn hoặc chờ duyệt không tính vào điểm trung bình." />
      <div className="card">
        <SearchBar
          onSearch={search}
          hint={pending ? 'Bạn đã đổi tiêu chí, bấm "Tìm kiếm" để cập nhật kết quả.' : undefined}
        >
          <input className="search" placeholder="Tìm theo bình luận, khách, sản phẩm…" value={draft.q} onChange={set('q')} />
          <select className="select" value={draft.status} onChange={set('status')} aria-label="Trạng thái">
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đang hiển thị</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>
          <select className="select" value={draft.rating} onChange={set('rating')} aria-label="Số sao">
            <option value="">Tất cả số sao</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
          </select>
        </SearchBar>

        {error && <p className="form-error">{error}</p>}
        {loading && <p className="muted center">Đang tải…</p>}
        {!loading && data?.items.length === 0 && <p className="muted center">Không có đánh giá nào</p>}

        <div className="review-list">
          {!loading &&
            data?.items.map((r) => (
              <article key={r.reviewId} className="review-card">
                <header className="review-card__head">
                  <div>
                    <strong>{r.productName}</strong>
                    <div><StarRating value={r.rating} /> <span className="muted">· {r.customerName} · {formatDateTime(r.createdAt)}{r.updatedAt ? ' (đã sửa)' : ''}</span></div>
                  </div>
                  <div className="review-card__badges">
                    {r.verifiedPurchase && <span className="badge badge--ok">Đã mua hàng</span>}
                    <span className={`badge review-status review-status--${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status]}</span>
                  </div>
                </header>
                <p className="review-card__comment">{r.comment || <span className="muted">(Không có bình luận)</span>}</p>
                {r.imageUrl && <a className="link" href={r.imageUrl} target="_blank" rel="noreferrer">Xem ảnh đính kèm</a>}

                {r.replies.length > 0 && (
                  <ul className="reply-list reply-list--inline">
                    {r.replies.map((p) => (
                      <li key={p.replyId}><strong>{p.employeeName}:</strong> {p.content}</li>
                    ))}
                  </ul>
                )}

                <div className="review-card__actions">
                  {r.status !== 'APPROVED' && <button className="btn btn--primary" onClick={() => changeStatus(r, 'APPROVED')}>Duyệt</button>}
                  {r.status !== 'HIDDEN' && <button className="btn btn--ghost" onClick={() => changeStatus(r, 'HIDDEN')}>Ẩn</button>}
                  {r.status === 'APPROVED' && <button className="btn btn--ghost" onClick={() => changeStatus(r, 'PENDING')}>Chuyển chờ duyệt</button>}
                  <button className="btn btn--ghost" onClick={() => setReplyId(r.reviewId)}>Phản hồi ({r.replies.length})</button>
                  {canDelete && <button className="btn btn--danger" onClick={() => remove(r)}>Xóa</button>}
                </div>
              </article>
            ))}
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />}
      </div>

      {active && <ReviewReplyModal review={active} onClose={() => setReplyId(null)} onChanged={load} />}
    </>
  );
}
