import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { cartController as c } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { addCartItemSchema, updateCartItemSchema, validateCartSchema, variantParam } from '../validators/cart.validator';

const r = Router();
r.use(authenticate, requireRole(ROLES.CUSTOMER)); // giỏ chỉ của khách, customerId lấy từ token
r.get('/', h(c.get));
r.delete('/', h(c.clear));
r.post('/items', validate(addCartItemSchema), h(c.addItem));
r.patch('/items/:variantId', validate(variantParam, 'params'), validate(updateCartItemSchema), h(c.updateItem));
r.delete('/items/:variantId', validate(variantParam, 'params'), h(c.removeItem));
r.post('/validate', validate(validateCartSchema), h(c.validate));
export default r;
