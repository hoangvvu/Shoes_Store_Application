import { query, sql, type Executor, type Param } from '../config/database';
import type { ReviewStatus } from '../constants/review.constant';
import { likePattern } from '../utils/pagination';

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

const REVIEW_COLS = `
  r.review_id AS reviewId, r.customer_id AS customerId, r.product_id AS productId, c.full_name AS customerName,
  r.rating, r.comment, r.image_url AS imageUrl, r.invoice_id AS invoiceId,
  CAST(CASE WHEN r.invoice_id IS NULL THEN 0 ELSE 1 END AS BIT) AS verifiedPurchase,
  r.status, r.created_at AS createdAt, r.updated_at AS updatedAt`;

const REVIEW_FROM = `FROM product_reviews r JOIN customers c ON c.customer_id = r.customer_id`;

export const reviewRepository = {
  async productExists(productId: number, exec?: Executor): Promise<boolean> {
    const r = await query(`SELECT 1 AS x FROM products WHERE product_id = @id AND is_deleted = 0`, { id: [sql.Int, productId] }, exec);
    return r.recordset.length > 0;
  },

  /** Số đánh giá khách gửi trong 1 giờ qua (kể cả đã xóa) – dùng cho giới hạn tần suất. */
  async countRecentByCustomer(customerId: number, exec?: Executor): Promise<number> {
    const r = await query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM product_reviews WHERE customer_id = @c AND created_at > DATEADD(HOUR, -1, SYSUTCDATETIME())`,
      { c: [sql.Int, customerId] },
      exec,
    );
    return r.recordset[0].n;
  },

  /** Không dùng OUTPUT: bảng có trigger trg_reviews_validate (kiểm tra invoice_id). */
  async insert(
    d: { customerId: number; productId: number; invoiceId: number | null; rating: number; comment: string | null; imageUrl: string | null; status: ReviewStatus },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO product_reviews (customer_id, product_id, invoice_id, rating, comment, image_url, status)
       VALUES (@c, @p, @inv, @rating, @comment, @img, @status);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        c: [sql.Int, d.customerId],
        p: [sql.Int, d.productId],
        inv: [sql.Int, d.invoiceId],
        rating: [sql.TinyInt, d.rating],
        comment: [sql.NVarChar(sql.MAX), d.comment],
        img: [sql.VarChar(500), d.imageUrl],
        status: [sql.VarChar(10), d.status],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async findById(reviewId: number, exec?: Executor): Promise<ReviewRow | null> {
    const r = await query<ReviewRow>(
      `SELECT ${REVIEW_COLS}, p.product_name AS productName ${REVIEW_FROM} JOIN products p ON p.product_id = r.product_id
       WHERE r.review_id = @id AND r.is_deleted = 0`,
      { id: [sql.Int, reviewId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /** Đánh giá của chính khách cho 1 sản phẩm (mọi trạng thái, chưa xóa). */
  async findByCustomerProduct(customerId: number, productId: number, exec?: Executor): Promise<ReviewRow | null> {
    const r = await query<ReviewRow>(
      `SELECT ${REVIEW_COLS} ${REVIEW_FROM} WHERE r.customer_id = @c AND r.product_id = @p AND r.is_deleted = 0`,
      { c: [sql.Int, customerId], p: [sql.Int, productId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  /** Cập nhật một phần; cờ *Set cho phép xóa trắng comment / ảnh. Ghi updated_at. */
  async update(
    reviewId: number,
    customerId: number,
    d: { rating?: number; comment?: string | null; commentSet: boolean; imageUrl?: string | null; imageSet: boolean },
    exec?: Executor,
  ): Promise<number> {
    const r = await query(
      `UPDATE product_reviews SET
         rating = COALESCE(@rating, rating),
         comment = CASE WHEN @commentSet = 1 THEN @comment ELSE comment END,
         image_url = CASE WHEN @imageSet = 1 THEN @img ELSE image_url END,
         updated_at = SYSUTCDATETIME()
       WHERE review_id = @id AND customer_id = @c AND is_deleted = 0`,
      {
        id: [sql.Int, reviewId],
        c: [sql.Int, customerId],
        rating: [sql.TinyInt, d.rating ?? null],
        commentSet: [sql.Bit, d.commentSet],
        comment: [sql.NVarChar(sql.MAX), d.comment ?? null],
        imageSet: [sql.Bit, d.imageSet],
        img: [sql.VarChar(500), d.imageUrl ?? null],
      },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  async softDelete(reviewId: number, exec?: Executor): Promise<number> {
    const r = await query(
      `UPDATE product_reviews SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE review_id = @id AND is_deleted = 0`,
      { id: [sql.Int, reviewId] },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  async setStatus(reviewId: number, status: ReviewStatus, exec?: Executor): Promise<number> {
    const r = await query(
      `UPDATE product_reviews SET status = @status WHERE review_id = @id AND is_deleted = 0`,
      { id: [sql.Int, reviewId], status: [sql.VarChar(10), status] },
      exec,
    );
    return r.rowsAffected[0] ?? 0;
  },

  /** Điểm trung bình + phân bố sao: chỉ tính đánh giá APPROVED chưa xóa (HIDDEN/PENDING không tính). */
  async summary(productId: number, exec?: Executor): Promise<RatingSummary> {
    const r = await query<Record<string, number | null>>(
      `SELECT COUNT(*) AS total,
              AVG(CAST(rating AS DECIMAL(3,2))) AS avg_rating,
              ISNULL(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS star5,
              ISNULL(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS star4,
              ISNULL(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS star3,
              ISNULL(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS star2,
              ISNULL(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS star1
       FROM product_reviews WHERE product_id = @p AND status = 'APPROVED' AND is_deleted = 0`,
      { p: [sql.Int, productId] },
      exec,
    );
    const x = r.recordset[0];
    return {
      total: Number(x.total),
      avgRating: x.avg_rating === null ? 0 : Math.round(Number(x.avg_rating) * 10) / 10,
      star1: Number(x.star1), star2: Number(x.star2), star3: Number(x.star3), star4: Number(x.star4), star5: Number(x.star5),
    };
  },

  /** Đánh giá công khai của sản phẩm (APPROVED), lọc theo sao, phân trang. */
  async listPublic(p: { productId: number; rating?: number; page: number; size: number }, exec?: Executor) {
    const params: Record<string, Param> = { p: [sql.Int, p.productId], rating: [sql.TinyInt, p.rating ?? null] };
    const where = `r.product_id = @p AND r.status = 'APPROVED' AND r.is_deleted = 0 AND (@rating IS NULL OR r.rating = @rating)`;
    const count = await query<{ total: number }>(`SELECT COUNT(*) AS total FROM product_reviews r WHERE ${where}`, params, exec);
    const rows = await query<ReviewRow>(
      `SELECT ${REVIEW_COLS} ${REVIEW_FROM} WHERE ${where}
       ORDER BY r.created_at DESC, r.review_id DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { ...params, offset: [sql.Int, (p.page - 1) * p.size], size: [sql.Int, p.size] },
      exec,
    );
    return { rows: rows.recordset, total: count.recordset[0].total };
  },

  /** Danh sách cho nhân viên/admin kiểm duyệt (mọi trạng thái). */
  async listForModeration(
    f: { status?: string; rating?: number; productId?: number; q?: string; page: number; size: number },
    exec?: Executor,
  ) {
    const params: Record<string, Param> = {
      status: [sql.VarChar(10), f.status ?? null],
      rating: [sql.TinyInt, f.rating ?? null],
      productId: [sql.Int, f.productId ?? null],
      pattern: [sql.NVarChar(210), f.q ? likePattern(f.q) : null],
    };
    const where = `r.is_deleted = 0
      AND (@status IS NULL OR r.status = @status)
      AND (@rating IS NULL OR r.rating = @rating)
      AND (@productId IS NULL OR r.product_id = @productId)
      AND (@pattern IS NULL OR r.comment LIKE @pattern ESCAPE '\\' OR c.full_name LIKE @pattern ESCAPE '\\' OR p.product_name LIKE @pattern ESCAPE '\\')`;
    const from = `${REVIEW_FROM} JOIN products p ON p.product_id = r.product_id`;
    const count = await query<{ total: number }>(`SELECT COUNT(*) AS total ${from} WHERE ${where}`, params, exec);
    const rows = await query<ReviewRow>(
      `SELECT ${REVIEW_COLS}, p.product_name AS productName ${from} WHERE ${where}
       ORDER BY CASE r.status WHEN 'PENDING' THEN 0 ELSE 1 END, r.created_at DESC, r.review_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      { ...params, offset: [sql.Int, (f.page - 1) * f.size], size: [sql.Int, f.size] },
      exec,
    );
    return { rows: rows.recordset, total: count.recordset[0].total };
  },

  /* ---------- phản hồi ---------- */

  async listReplies(reviewIds: number[], exec?: Executor): Promise<ReplyRow[]> {
    if (!reviewIds.length) return [];
    const list = reviewIds.map((n) => Math.trunc(Number(n))).join(','); // id lấy từ CSDL, là số nguyên
    const r = await query<ReplyRow>(
      `SELECT p.reply_id AS replyId, p.review_id AS reviewId, p.employee_id AS employeeId, e.full_name AS employeeName,
              p.content, p.created_at AS createdAt, p.updated_at AS updatedAt
       FROM review_replies p JOIN employees e ON e.employee_id = p.employee_id
       WHERE p.review_id IN (${list}) AND p.is_deleted = 0 ORDER BY p.reply_id`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findReply(replyId: number, exec?: Executor): Promise<ReplyRow | null> {
    const r = await query<ReplyRow>(
      `SELECT p.reply_id AS replyId, p.review_id AS reviewId, p.employee_id AS employeeId, e.full_name AS employeeName,
              p.content, p.created_at AS createdAt, p.updated_at AS updatedAt
       FROM review_replies p JOIN employees e ON e.employee_id = p.employee_id
       WHERE p.reply_id = @id AND p.is_deleted = 0`,
      { id: [sql.Int, replyId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async insertReply(reviewId: number, employeeId: number, content: string, exec?: Executor): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO review_replies (review_id, employee_id, content) VALUES (@r, @e, @content);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      { r: [sql.Int, reviewId], e: [sql.Int, employeeId], content: [sql.NVarChar(sql.MAX), content] },
      exec,
    );
    return r.recordset[0].id;
  },

  async updateReply(replyId: number, content: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE review_replies SET content = @content, updated_at = SYSUTCDATETIME() WHERE reply_id = @id AND is_deleted = 0`,
      { id: [sql.Int, replyId], content: [sql.NVarChar(sql.MAX), content] },
      exec,
    );
  },

  async softDeleteReply(replyId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE review_replies SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE reply_id = @id AND is_deleted = 0`,
      { id: [sql.Int, replyId] },
      exec,
    );
  },
};
