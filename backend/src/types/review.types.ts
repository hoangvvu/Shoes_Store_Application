import type { ReviewStatus } from '../constants/review.constant';

export interface ReviewRow {
  reviewId: number;
  customerId: number;
  productId: number;
  customerName: string;
  productName?: string;
  rating: number;
  comment: string | null;
  imageUrl: string | null;
  invoiceId: number | null;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface ReplyRow {
  replyId: number;
  reviewId: number;
  employeeId: number;
  employeeName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface RatingSummary {
  total: number;
  avgRating: number;
  star1: number;
  star2: number;
  star3: number;
  star4: number;
  star5: number;
}
