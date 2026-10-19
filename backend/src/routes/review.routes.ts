import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { reviewController as c } from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  createReviewSchema, moderationListQuery, productIdParam, productReviewsQuery,
  replySchema, reviewIdParam, statusSchema, updateReviewSchema,
} from '../validators/review.validator';

const { ADMIN, SALES, CUSTOMER } = ROLES;

/** /api/v1/products/:productId/reviews  (mount trong routes/index.ts, không đụng router sản phẩm của M4) */
export const productReviewsRouter = Router({ mergeParams: true });
productReviewsRouter.use(authenticate);
productReviewsRouter.get('/', validate(productIdParam, 'params'), validate(productReviewsQuery, 'query'), h(c.listForProduct));
productReviewsRouter.post('/', requireRole(CUSTOMER), validate(productIdParam, 'params'), validate(createReviewSchema), h(c.create));

/** /api/v1/reviews */
const reviews = Router();
reviews.use(authenticate);
// GET /reviews: bổ sung ngoài docx để nhân viên có danh sách kiểm duyệt
reviews.get('/', requireRole(ADMIN, SALES), validate(moderationListQuery, 'query'), h(c.listForModeration));
reviews.put('/:id', requireRole(CUSTOMER), validate(reviewIdParam, 'params'), validate(updateReviewSchema), h(c.update));
reviews.delete('/:id', requireRole(CUSTOMER, ADMIN), validate(reviewIdParam, 'params'), h(c.remove));
reviews.patch('/:id/status', requireRole(ADMIN, SALES), validate(reviewIdParam, 'params'), validate(statusSchema), h(c.setStatus));
reviews.post('/:id/replies', requireRole(ADMIN, SALES), validate(reviewIdParam, 'params'), validate(replySchema), h(c.addReply));
export default reviews;

/** /api/v1/replies */
export const repliesRouter = Router();
repliesRouter.use(authenticate, requireRole(ADMIN, SALES));
repliesRouter.put('/:id', validate(idParam, 'params'), validate(replySchema), h(c.updateReply));
repliesRouter.delete('/:id', validate(idParam, 'params'), h(c.removeReply));
