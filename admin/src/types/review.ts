export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN';

export interface ReviewReply {
  replyId: number;
  content: string;
  employeeName: string;
  createdAt: string;
  updatedAt: string | null;
  /** Nhân viên chỉ sửa/xóa phản hồi của mình; Admin sửa/xóa tất cả. */
  canEdit: boolean;
}

export interface ModerationReview {
  reviewId: number;
  productId: number;
  productName: string;
  customerName: string;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string | null;
  replies: ReviewReply[];
}

export interface ReviewListParams {
  status?: ReviewStatus;
  rating?: number;
  q?: string;
  page: number;
  size: number;
}
