import type { MyReview, ProductReviews, ReviewInput } from '@/types/review';
import { api } from './api';

export const reviewService = {
  async listForProduct(productId: number, params: { rating?: number; page: number; size: number }): Promise<ProductReviews> {
    const { data } = await api.get<ProductReviews>(`/products/${productId}/reviews`, { params });
    return data;
  },
  async create(productId: number, input: ReviewInput): Promise<MyReview> {
    const { data } = await api.post<MyReview>(`/products/${productId}/reviews`, input);
    return data;
  },
  async update(reviewId: number, input: Omit<ReviewInput, 'invoiceId'>): Promise<MyReview> {
    const { data } = await api.put<MyReview>(`/reviews/${reviewId}`, input);
    return data;
  },
  async remove(reviewId: number): Promise<void> {
    await api.delete(`/reviews/${reviewId}`);
  },
};
