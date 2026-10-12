import { useState } from 'react';
import { reviewService } from '../../services/review.service';
import type { ModerationReview } from '../../types/review';
import { getErrorMessage } from '../../utils/error';
import { formatDateTime } from '../../utils/format';
import { Modal } from '../common/Modal';
import { StarRating } from './StarRating';

interface Props {
  review: ModerationReview;
  onClose: () => void;
  /** Gọi sau mỗi thay đổi để danh sách tải lại; `review` mới sẽ được truyền xuống. */
  onChanged: () => Promise<void>;
}

/** Thêm / sửa / xóa phản hồi của một đánh giá (một đánh giá có thể có nhiều phản hồi). */
export function ReviewReplyModal({ review, onClose, onChanged }: Props) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setBusy(true);
    setError('');
    try {
      await action();
      await onChanged();
      after?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const content = text.trim();
    if (!content) return setError('Vui lòng nhập nội dung phản hồi');
    void run(
      () => (editingId ? reviewService.updateReply(editingId, content) : reviewService.addReply(review.reviewId, content)),
      () => {
        setText('');
        setEditingId(null);
      },
    );
  }

  return (
    <Modal title="Phản hồi đánh giá" onClose={onClose}>
      <div className="review-quote">
        <div><strong>{review.customerName}</strong> · <StarRating value={review.rating} /></div>
        <div className="muted">{review.productName}</div>
        <p>{review.comment || <span className="muted">(Không có bình luận)</span>}</p>
      </div>

      <h3>Phản hồi ({review.replies.length})</h3>
      <ul className="reply-list">
        {review.replies.length === 0 && <li className="muted">Chưa có phản hồi nào.</li>}
        {review.replies.map((r) => (
          <li key={r.replyId}>
            <div className="reply-list__head">
              <strong>{r.employeeName}</strong>
              <span className="muted">{formatDateTime(r.createdAt)}{r.updatedAt ? ' · đã sửa' : ''}</span>
            </div>
            <p>{r.content}</p>
            {r.canEdit && (
              <div className="reply-list__actions">
                <button className="btn btn--ghost" disabled={busy} onClick={() => { setEditingId(r.replyId); setText(r.content); }}>Sửa</button>
                <button className="btn btn--danger" disabled={busy} onClick={() => window.confirm('Xóa phản hồi này?') && run(() => reviewService.removeReply(r.replyId))}>Xóa</button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <label className="field">
        <span>{editingId ? 'Sửa phản hồi' : 'Thêm phản hồi'}</span>
        <textarea className="textarea" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {!editingId && <p className="muted">Khách hàng sẽ nhận được thông báo khi bạn gửi phản hồi.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form__actions">
        {editingId && <button className="btn btn--ghost" onClick={() => { setEditingId(null); setText(''); }}>Hủy sửa</button>}
        <button className="btn btn--ghost" onClick={onClose}>Đóng</button>
        <button className="btn btn--primary" disabled={busy} onClick={submit}>{editingId ? 'Lưu phản hồi' : 'Gửi phản hồi'}</button>
      </div>
    </Modal>
  );
}
