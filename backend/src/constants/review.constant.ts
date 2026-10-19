export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'HIDDEN'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * Chính sách kiểm duyệt (docx M14): APPROVED = hiển thị ngay; đổi thành 'PENDING' nếu muốn duyệt trước.
 * Đánh giá PENDING / HIDDEN không tính vào điểm trung bình và không hiện cho khách khác.
 */
export const DEFAULT_REVIEW_STATUS: ReviewStatus = 'APPROVED';

export const REVIEW_COMMENT_MAX = 1000;
export const REPLY_MAX = 1000;

/** Chống spam: mỗi khách tối đa N đánh giá mới trong 1 giờ (tính cả đánh giá đã xóa). */
export const REVIEW_RATE_LIMIT_PER_HOUR = 5;
