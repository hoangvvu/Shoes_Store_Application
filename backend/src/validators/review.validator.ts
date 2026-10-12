import { z } from 'zod';
import { REPLY_MAX, REVIEW_COMMENT_MAX, REVIEW_STATUSES } from '../constants/review.constant';
import { paginationQuery } from '../utils/pagination';

const id = (label: string) => z.coerce.number({ invalid_type_error: `${label} không hợp lệ` }).int().positive(`${label} không hợp lệ`);

const rating = z.coerce
  .number({ invalid_type_error: 'Số sao không hợp lệ' })
  .int('Số sao phải là số nguyên')
  .min(1, 'Số sao từ 1 đến 5')
  .max(5, 'Số sao từ 1 đến 5');

const comment = z.string().trim().max(REVIEW_COMMENT_MAX, `Bình luận tối đa ${REVIEW_COMMENT_MAX} ký tự`);

const imageUrl = z
  .string()
  .trim()
  .max(500, 'Đường dẫn ảnh tối đa 500 ký tự')
  .refine((v) => /^https?:\/\/\S+$/i.test(v), 'Đường dẫn ảnh phải bắt đầu bằng http:// hoặc https://');

export const productIdParam = z.object({ productId: id('Mã sản phẩm') });
export const reviewIdParam = z.object({ id: id('Mã đánh giá') });

export const createReviewSchema = z.object({
  rating,
  comment: comment.optional(),
  imageUrl: imageUrl.optional(),
  /** Gắn đơn đã mua để hiện nhãn "Đã mua hàng"; trigger CSDL kiểm tra đơn của khách, đã giao, có sản phẩm này. */
  invoiceId: id('Mã đơn hàng').optional(),
});

/**
 * Sửa đánh giá. `comment: ""` hoặc `imageUrl: null` = xóa nội dung đó; bỏ qua trường = giữ nguyên.
 */
export const updateReviewSchema = z
  .object({
    rating: rating.optional(),
    comment: comment.optional(),
    imageUrl: imageUrl.nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Không có thông tin nào để cập nhật' });

export const productReviewsQuery = paginationQuery.extend({ rating: rating.optional() });

export const moderationListQuery = paginationQuery.extend({
  status: z.enum(REVIEW_STATUSES).optional(),
  rating: rating.optional(),
  productId: id('Mã sản phẩm').optional(),
  q: z.string().trim().max(100).optional(),
});

export const statusSchema = z.object({
  status: z.enum(REVIEW_STATUSES, { errorMap: () => ({ message: 'Trạng thái phải là PENDING, APPROVED hoặc HIDDEN' }) }),
});

export const replySchema = z.object({
  content: z.string({ required_error: 'Vui lòng nhập nội dung phản hồi' }).trim().min(1, 'Vui lòng nhập nội dung phản hồi').max(REPLY_MAX, `Phản hồi tối đa ${REPLY_MAX} ký tự`),
});

export const favoriteParam = z.object({ productId: id('Mã sản phẩm') });
export const favoritesQuery = paginationQuery;

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type ProductReviewsQuery = z.infer<typeof productReviewsQuery>;
export type ModerationListQuery = z.infer<typeof moderationListQuery>;
