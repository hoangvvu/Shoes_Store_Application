import type { Paged } from '../types/customer';
import type { ModerationReview, ReviewListParams, ReviewReply, ReviewStatus } from '../types/review';
import { api } from './api';

export const reviewService = {
  async list(p: ReviewListParams): Promise<Paged<ModerationReview>> {
    const { data } = await api.get<Paged<ModerationReview>>('/reviews', {
      params: { ...p, status: p.status || undefined, rating: p.rating || undefined, q: p.q || undefined },
    });
    return data;
  },
  async setStatus(id: number, status: ReviewStatus): Promise<void> {
    await api.patch(`/reviews/${id}/status`, { status });
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/reviews/${id}`);
  },
  async addReply(reviewId: number, content: string): Promise<ReviewReply> {
    const { data } = await api.post<ReviewReply>(`/reviews/${reviewId}/replies`, { content });
    return data;
  },
  async updateReply(replyId: number, content: string): Promise<ReviewReply> {
    const { data } = await api.put<ReviewReply>(`/replies/${replyId}`, { content });
    return data;
  },
  async removeReply(replyId: number): Promise<void> {
    await api.delete(`/replies/${replyId}`);
  },
};
