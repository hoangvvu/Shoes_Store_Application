export interface ReviewReply {
  replyId: number;
  content: string;
  employeeName: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface PublicReview {
  reviewId: number;
  customerName: string;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string | null;
  replies: ReviewReply[];
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN';

/** Đánh giá của chính khách (kèm trạng thái kiểm duyệt). */
export interface MyReview {
  reviewId: number;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReviewSummary {
  total: number;
  avgRating: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ProductReviews {
  summary: ReviewSummary;
  mine: MyReview | null;
  items: PublicReview[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface ReviewInput {
  rating: number;
  comment?: string;
  imageUrl?: string | null;
  invoiceId?: number;
}

export interface FavoriteItem {
  productId: number;
  productName: string;
  imageUrl: string | null;
  currentPrice: number;
  favoritedAt: string;
}

export interface PagedFavorites {
  items: FavoriteItem[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
