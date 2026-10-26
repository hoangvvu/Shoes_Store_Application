import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { deliveryController as c } from '../controllers/delivery.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import {
  confirmDeliveryPaymentSchema,
  deliveryOrderParam,
  deliveryPaymentParam,
} from '../validators/delivery.validator';

/** /api/v1/delivery – màn giao hàng trên mobile (Bán hàng + Admin). */
const r = Router();
r.use(authenticate, requireRole(ROLES.SALES, ROLES.ADMIN));

r.get('/orders', h(c.list));
r.get('/orders/:id', validate(deliveryOrderParam, 'params'), h(c.get));
r.post(
  '/orders/:id/payments/:paymentId/confirm',
  validate(deliveryPaymentParam, 'params'),
  validate(confirmDeliveryPaymentSchema),
  h(c.confirmPayment),
);
r.post('/orders/:id/deliver', validate(deliveryOrderParam, 'params'), h(c.deliver));

export default r;
