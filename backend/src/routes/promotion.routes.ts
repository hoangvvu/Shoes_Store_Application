import { Router } from 'express';
import { promotionController } from '../controllers/promotion.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParam } from '../validators/common';
import {
  createPromotionSchema,
  createVoucherSchema,
  generateBatchVouchersSchema,
  syncPromotionProductsSchema,
  syncPromotionTiersSchema,
  updatePromotionSchema,
  updatePromotionStatusSchema,
  validateVoucherSchema,
  voucherCodeParam,
} from '../validators/promotion.validator';

export const promotionsRouter = Router();
export const vouchersRouter = Router();

// ================= PUBLIC / CUSTOMER ROUTES =================
promotionsRouter.get('/active', optionalAuth, promotionController.getActivePromotions);
vouchersRouter.get('/public', optionalAuth, promotionController.getPublicVouchers);
vouchersRouter.post('/validate', optionalAuth, validate(validateVoucherSchema), promotionController.validateVoucher);

// ================= ADMIN PROMOTION ROUTES =================
promotionsRouter.use(authenticate, requireRole('ADMIN'));

promotionsRouter.get('/', promotionController.listPromotions);
promotionsRouter.get('/:id', validate(idParam, 'params'), promotionController.getPromotionDetail);
promotionsRouter.post('/', validate(createPromotionSchema), promotionController.createPromotion);
promotionsRouter.put(
  '/:id',
  validate(idParam, 'params'),
  validate(updatePromotionSchema),
  promotionController.updatePromotion,
);
promotionsRouter.patch(
  '/:id/status',
  validate(idParam, 'params'),
  validate(updatePromotionStatusSchema),
  promotionController.toggleStatus,
);
promotionsRouter.delete('/:id', validate(idParam, 'params'), promotionController.deletePromotion);

// Gán sản phẩm (loại PRODUCT)
promotionsRouter.put(
  '/:id/products',
  validate(idParam, 'params'),
  validate(syncPromotionProductsSchema),
  promotionController.syncProducts,
);

// Thiết lập bậc tiền hóa đơn (loại INVOICE)
promotionsRouter.put(
  '/:id/tiers',
  validate(idParam, 'params'),
  validate(syncPromotionTiersSchema),
  promotionController.syncTiers,
);

// Quản lý Voucher thuộc chương trình (loại VOUCHER)
promotionsRouter.get('/:id/vouchers', validate(idParam, 'params'), promotionController.listVouchers);
promotionsRouter.post(
  '/:id/vouchers',
  validate(idParam, 'params'),
  validate(createVoucherSchema),
  promotionController.createVoucher,
);
promotionsRouter.post(
  '/:id/vouchers/generate-batch',
  validate(idParam, 'params'),
  validate(generateBatchVouchersSchema),
  promotionController.generateBatchVouchers,
);

// ================= ADMIN VOUCHERS MANAGEMENT =================
vouchersRouter.patch(
  '/:code/status',
  authenticate,
  requireRole('ADMIN'),
  validate(voucherCodeParam, 'params'),
  promotionController.toggleVoucherStatus,
);

export default promotionsRouter;
