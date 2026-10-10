import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { addressController as c } from '../controllers/address.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator';

const r = Router();
r.use(authenticate, requireRole(ROLES.CUSTOMER)); // chỉ khách thao tác địa chỉ của chính mình
r.get('/', h(c.list));
r.post('/', validate(createAddressSchema), h(c.create));
r.put('/:id', validate(idParam, 'params'), validate(updateAddressSchema), h(c.update));
r.patch('/:id/default', validate(idParam, 'params'), h(c.setDefault));
r.delete('/:id', validate(idParam, 'params'), h(c.remove));
export default r;
