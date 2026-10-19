import { withTransaction } from '../config/database';
import { ROLES } from '../constants/auth.constant';
import { DEFAULT_REVIEW_STATUS, REVIEW_RATE_LIMIT_PER_HOUR, type ReviewStatus } from '../constants/review.constant';
import { AppError } from '../errors/AppError';
import { reviewRepository, type ReplyRow, type ReviewRow } from '../repositories/review.repository';
import { reviewNotificationRepository } from '../repositories/reviewNotification.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';
import type { CreateReviewInput, ModerationListQuery, ProductReviewsQuery, UpdateReviewInput } from '../validators/review.validator';

const REVIEW_NOT_FOUND = () => AppError.notFound('Không tìm thấy đánh giá', 'REVIEW_NOT_FOUND');
const REPLY_NOT_FOUND = () => AppError.notFound('Không tìm thấy phản hồi', 'REPLY_NOT_FOUND');
const PRODUCT_NOT_FOUND = () => AppError.notFound('Không tìm thấy sản phẩm', 'PRODUCT_NOT_FOUND');

function customerIdOf(auth: AuthUser): number {
  if (!auth.customerId) throw AppError.forbidden();
  return auth.customerId;
}

function employeeIdOf(auth: AuthUser): number {
  if (!auth.employeeId) throw AppError.forbidden();
  return auth.employeeId;
}

const publicReply = (r: ReplyRow) => ({
  replyId: r.replyId, content: r.content, employeeName: r.employeeName, createdAt: r.createdAt, updatedAt: r.updatedAt,
});

/** Đánh giá hiển thị cho khách: không lộ customerId/invoiceId, chỉ có nhãn "Đã mua hàng". */
const publicReview = (r: ReviewRow, replies: ReplyRow[]) => ({
  reviewId: r.reviewId,
  customerName: r.customerName,
  rating: r.rating,
  comment: r.comment,
  imageUrl: r.imageUrl,
  verifiedPurchase: r.verifiedPurchase,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  replies: replies.filter((x) => x.reviewId === r.reviewId).map(publicReply),
});

const ownReview = (r: ReviewRow) => ({
  reviewId: r.reviewId, rating: r.rating, comment: r.comment, imageUrl: r.imageUrl,
  verifiedPurchase: r.verifiedPurchase, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt,
});

export const reviewService = {
  /* ===================== KHÁCH ===================== */

  /** Mỗi khách một đánh giá cho mỗi sản phẩm (uq_review_cus_prod). Có invoiceId thì trigger kiểm tra "đã mua". */
  async create(auth: AuthUser, productId: number, input: CreateReviewInput) {
    const customerId = customerIdOf(auth);
    if (!(await reviewRepository.productExists(productId))) throw PRODUCT_NOT_FOUND();
    if ((await reviewRepository.countRecentByCustomer(customerId)) >= REVIEW_RATE_LIMIT_PER_HOUR) {
      throw AppError.tooMany('Bạn gửi đánh giá quá nhanh, vui lòng thử lại sau ít phút');
    }
    if (await reviewRepository.findByCustomerProduct(customerId, productId)) {
      throw AppError.conflict('Bạn đã đánh giá sản phẩm này, hãy sửa đánh giá hiện có', 'REVIEW_EXISTS');
    }

    try {
      const id = await withTransaction(async (tx) => {
        await setActor(tx, auth.userId);
        return reviewRepository.insert(
          {
            customerId, productId,
            invoiceId: input.invoiceId ?? null,
            rating: input.rating,
            comment: input.comment?.trim() || null,
            imageUrl: input.imageUrl ?? null,
            status: DEFAULT_REVIEW_STATUS,
          },
          tx,
        );
      });
      const created = (await reviewRepository.findByCustomerProduct(customerId, productId))!;
      return { ...ownReview(created), reviewId: id };
    } catch (err) {
      if (isDuplicateKey(err, 'uq_review_cus_prod')) throw AppError.conflict('Bạn đã đánh giá sản phẩm này', 'REVIEW_EXISTS');
      throw err; // lỗi 51060 (invoice_id không hợp lệ) do errorHandler trả 409 kèm thông điệp của CSDL
    }
  },

  /** Khách sửa đánh giá của chính mình (customerId từ token, đánh giá người khác trả 404); ghi updated_at. */
  async update(auth: AuthUser, reviewId: number, input: UpdateReviewInput) {
    const customerId = customerIdOf(auth);
    const affected = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      return reviewRepository.update(
        reviewId,
        customerId,
        {
          rating: input.rating,
          commentSet: input.comment !== undefined,
          comment: input.comment === undefined ? null : input.comment.trim() || null,
          imageSet: input.imageUrl !== undefined,
          imageUrl: input.imageUrl ?? null,
        },
        tx,
      );
    });
    if (affected === 0) throw REVIEW_NOT_FOUND();
    return ownReview((await reviewRepository.findById(reviewId))!);
  },

  /** Khách xóa đánh giá của mình; Admin xóa đánh giá vi phạm. Xóa mềm. */
  async remove(auth: AuthUser, reviewId: number) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) throw REVIEW_NOT_FOUND();
    if (auth.role === ROLES.CUSTOMER && review.customerId !== auth.customerId) throw REVIEW_NOT_FOUND();
    if (auth.role !== ROLES.CUSTOMER && auth.role !== ROLES.ADMIN) throw AppError.forbidden();
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      await reviewRepository.softDelete(reviewId, tx);
    });
  },

  /** Đánh giá đã duyệt của sản phẩm + điểm trung bình, phân bố sao; kèm đánh giá của chính khách (mọi trạng thái). */
  async listForProduct(auth: AuthUser, productId: number, q: ProductReviewsQuery) {
    if (!(await reviewRepository.productExists(productId))) throw PRODUCT_NOT_FOUND();
    const [summary, list, mine] = await Promise.all([
      reviewRepository.summary(productId),
      reviewRepository.listPublic({ productId, rating: q.rating, page: q.page, size: q.size }),
      auth.role === ROLES.CUSTOMER && auth.customerId ? reviewRepository.findByCustomerProduct(auth.customerId, productId) : null,
    ]);
    const replies = await reviewRepository.listReplies(list.rows.map((r) => r.reviewId));
    return {
      summary: {
        total: summary.total,
        avgRating: summary.avgRating,
        distribution: { 5: summary.star5, 4: summary.star4, 3: summary.star3, 2: summary.star2, 1: summary.star1 },
      },
      mine: mine ? ownReview(mine) : null,
      ...toPaged(list.rows.map((r) => publicReview(r, replies)), list.total, q.page, q.size),
    };
  },

  /* ===================== NHÂN VIÊN / ADMIN ===================== */

  /** Danh sách kiểm duyệt (mọi trạng thái, PENDING lên đầu) kèm phản hồi và quyền sửa/xóa từng phản hồi. */
  async listForModeration(auth: AuthUser, q: ModerationListQuery) {
    const { rows, total } = await reviewRepository.listForModeration(q);
    const replies = await reviewRepository.listReplies(rows.map((r) => r.reviewId));
    const items = rows.map((r) => ({
      reviewId: r.reviewId,
      productId: r.productId,
      productName: r.productName,
      customerName: r.customerName,
      rating: r.rating,
      comment: r.comment,
      imageUrl: r.imageUrl,
      verifiedPurchase: r.verifiedPurchase,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      replies: replies
        .filter((x) => x.reviewId === r.reviewId)
        .map((x) => ({ ...publicReply(x), canEdit: auth.role === ROLES.ADMIN || x.employeeId === auth.employeeId })),
    }));
    return toPaged(items, total, q.page, q.size);
  },

  async setStatus(auth: AuthUser, reviewId: number, status: ReviewStatus) {
    const affected = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      return reviewRepository.setStatus(reviewId, status, tx);
    });
    if (affected === 0) throw REVIEW_NOT_FOUND();
    return { reviewId, status };
  },

  /** Thêm phản hồi (một đánh giá có nhiều phản hồi) và gửi thông báo cho khách đã viết đánh giá. */
  async addReply(auth: AuthUser, reviewId: number, content: string) {
    const employeeId = employeeIdOf(auth);
    const replyId = await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      const review = await reviewRepository.findById(reviewId, tx);
      if (!review) throw REVIEW_NOT_FOUND();
      const id = await reviewRepository.insertReply(reviewId, employeeId, content, tx);
      await reviewNotificationRepository.notifyCustomer(
        {
          customerId: review.customerId,
          createdByEmployeeId: employeeId,
          title: 'Cửa hàng đã phản hồi đánh giá của bạn',
          content: `Đánh giá của bạn về "${review.productName}" đã nhận được phản hồi: ${content.length > 120 ? `${content.slice(0, 117)}…` : content}`,
          linkUrl: `/reviews/${review.productId}`,
        },
        tx,
      );
      return id;
    });
    return publicReply((await reviewRepository.findReply(replyId))!);
  },

  /** Nhân viên chỉ sửa/xóa phản hồi do chính mình viết; Admin sửa/xóa mọi phản hồi. */
  async loadReplyFor(auth: AuthUser, replyId: number): Promise<ReplyRow> {
    const reply = await reviewRepository.findReply(replyId);
    if (!reply) throw REPLY_NOT_FOUND();
    if (auth.role !== ROLES.ADMIN && reply.employeeId !== auth.employeeId) {
      throw AppError.forbidden('Bạn chỉ được sửa hoặc xóa phản hồi do chính mình viết');
    }
    return reply;
  },

  async updateReply(auth: AuthUser, replyId: number, content: string) {
    await this.loadReplyFor(auth, replyId);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      await reviewRepository.updateReply(replyId, content, tx);
    });
    return publicReply((await reviewRepository.findReply(replyId))!);
  },

  async removeReply(auth: AuthUser, replyId: number) {
    await this.loadReplyFor(auth, replyId);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      await reviewRepository.softDeleteReply(replyId, tx);
    });
  },
};
