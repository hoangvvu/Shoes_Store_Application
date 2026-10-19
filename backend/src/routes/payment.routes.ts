import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { paymentController as c } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  bankWebhookSchema,
  completeRefundSchema,
  confirmCashSchema,
  createMethodSchema,
  createRefundSchema,
  momoWebhookSchema,
  rejectRefundSchema,
  reviewProofSchema,
  retryPaySchema,
  setMethodActiveSchema,
  uploadProofSchema,
} from '../validators/payment.validator';

const { ADMIN, SALES, CUSTOMER } = ROLES;
const id = validate(idParam, 'params');

// ─── /api/v1/payment-methods ─────────────────────────────────────────────────
export const paymentMethodRouter = Router();

/** GET  /payment-methods          – khách hoặc nhân viên (all=1 cho admin) */
paymentMethodRouter.get('/', authenticate, requireRole(CUSTOMER, SALES, ADMIN), h(c.listMethods));
/** POST /payment-methods          – Admin */
paymentMethodRouter.post('/', authenticate, requireRole(ADMIN), validate(createMethodSchema), h(c.createMethod));
/** PATCH /payment-methods/:id/active – Admin bật/tắt */
paymentMethodRouter.patch('/:id/active', authenticate, requireRole(ADMIN), id, validate(setMethodActiveSchema), h(c.setMethodActive));
/** DELETE /payment-methods/:id   – Admin xóa mềm */
paymentMethodRouter.delete('/:id', authenticate, requireRole(ADMIN), id, h(c.deleteMethod));

// ─── /api/v1/payments ────────────────────────────────────────────────────────
export const paymentsRouter = Router();
paymentsRouter.use(authenticate);

/** POST /payments/:id/confirm-cash – NV xác nhận thu tiền mặt */
paymentsRouter.post('/:id/confirm-cash', requireRole(SALES, ADMIN), id, validate(confirmCashSchema), h(c.confirmCash));
/** POST /payments/:id/proof       – Khách tải ảnh chứng từ */
paymentsRouter.post('/:id/proof', requireRole(CUSTOMER), id, validate(uploadProofSchema), h(c.uploadProof));
/** POST /payments/:id/review      – NV đối soát */
paymentsRouter.post('/:id/review', requireRole(SALES, ADMIN), id, validate(reviewProofSchema), h(c.reviewProof));

// ─── /api/v1/orders/:id/payment  (gắn vào order router bên ngoài) ─────────────
/** Dùng trong order.routes.ts:
 *    orders.get('/:id/payment', requireRole(CUSTOMER, SALES, ADMIN), id, h(paymentController.getPaymentStatus));
 *    orders.post('/:id/pay',    requireRole(CUSTOMER), id, validate(retryPaySchema), h(paymentController.retryPay));
 */

// ─── /api/v1/webhooks ────────────────────────────────────────────────────────
/** Webhook KHÔNG cần authenticate (gọi từ cổng thanh toán bên ngoài).
 *  Xác thực bằng chữ ký HMAC trong controller/service. */
export const webhookRouter = Router();
webhookRouter.post('/momo', validate(momoWebhookSchema), h(c.webhookMomo));
webhookRouter.post('/bank', validate(bankWebhookSchema), h(c.webhookBank));

// ─── /api/v1/refunds ─────────────────────────────────────────────────────────
export const refundsRouter = Router();
refundsRouter.use(authenticate);

/** POST /refunds                  – NV/Admin tạo yêu cầu hoàn */
refundsRouter.post('/', requireRole(SALES, ADMIN), validate(createRefundSchema), h(c.createRefund));
/** PATCH /refunds/:id/complete    – NV/Admin xác nhận đã hoàn xong */
refundsRouter.patch('/:id/complete', requireRole(SALES, ADMIN), id, validate(completeRefundSchema), h(c.completeRefund));
/** PATCH /refunds/:id/reject      – Admin từ chối */
refundsRouter.patch('/:id/reject', requireRole(ADMIN), id, validate(rejectRefundSchema), h(c.rejectRefund));
