import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { orderController as c } from '../controllers/order.controller';
import { paymentController as pc } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { requireActiveShift } from '../middleware/shiftGuard.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import {
  cancelSchema, createOrderSchema, editItemsSchema, myOrdersQuery, noteSchema,
  orderListQuery, posOrderSchema, posPreviewSchema, posProductQuery, previewOrderSchema, printQuery,
} from '../validators/order.validator';
import { retryPaySchema } from '../validators/payment.validator';

const { ADMIN, SALES, CUSTOMER } = ROLES;
const id = validate(idParam, 'params');

/** /api/v1/orders */
const orders = Router();
orders.use(authenticate);
orders.post('/preview', requireRole(CUSTOMER), validate(previewOrderSchema), h(c.preview)); // phải đứng trước /:id
orders.post('/', requireRole(CUSTOMER), validate(createOrderSchema), h(c.create));
orders.get('/', requireRole(ADMIN, SALES), validate(orderListQuery, 'query'), h(c.list));
orders.get('/:id', requireRole(CUSTOMER, SALES, ADMIN), id, h(c.get)); // khách chỉ xem đơn của mình (service kiểm tra)
orders.get('/:id/print', requireRole(ADMIN, SALES), id, validate(printQuery, 'query'), h(c.print));
orders.post('/:id/cancel', requireRole(CUSTOMER, SALES, ADMIN), id, validate(cancelSchema), h(c.cancel));
orders.post('/:id/reorder', requireRole(CUSTOMER), id, h(c.reorder));
orders.post('/:id/confirm', requireRole(ADMIN, SALES), id, validate(noteSchema), h(c.confirm));
orders.post('/:id/ship', requireRole(ADMIN, SALES), id, validate(noteSchema), h(c.ship));
orders.post('/:id/deliver', requireRole(ADMIN, SALES), id, validate(noteSchema), h(c.deliver));
orders.put('/:id/items', requireRole(ADMIN, SALES), id, validate(editItemsSchema), h(c.editItems));
orders.delete('/:id', requireRole(ADMIN), id, h(c.remove));
// M9 – thanh toán
orders.get('/:id/payment', requireRole(CUSTOMER, SALES, ADMIN), id, h(pc.getPaymentStatus));
orders.post('/:id/pay', requireRole(CUSTOMER), id, validate(retryPaySchema), h(pc.retryPay));

/** /api/v1/me/orders */
export const myOrdersRouter = Router();
myOrdersRouter.get('/', authenticate, requireRole(CUSTOMER), validate(myOrdersQuery, 'query'), h(c.listMine));

/** /api/v1/pos */
export const posRouter = Router();
// POS dùng chung cho Admin và Bán hàng (WAREHOUSE và CUSTOMER không có quyền)
posRouter.use(authenticate, requireRole(ADMIN, SALES));
posRouter.get('/products', validate(posProductQuery, 'query'), h(c.posProducts));
posRouter.get('/payment-methods', h(c.posPaymentMethods));
posRouter.post('/preview', validate(posPreviewSchema), h(c.previewPos));
posRouter.post('/orders', requireActiveShift, validate(posOrderSchema), h(c.createPos));

export default orders;
