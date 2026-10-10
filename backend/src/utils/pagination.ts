import { z } from 'zod';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(10),
});

export interface Paged<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export function toPaged<T>(items: T[], total: number, page: number, size: number): Paged<T> {
  return { items, page, size, total, totalPages: Math.max(1, Math.ceil(total / size)) };
}

/** Thoát ký tự đại diện của LIKE (% _ [ \) để tìm kiếm theo đúng nghĩa đen. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_[]/g, '\\$&')}%`;
}
