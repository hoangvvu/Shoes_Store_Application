import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { uploadController } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';

const { ADMIN, SALES, WAREHOUSE } = ROLES;
const r = Router();

r.post('/', authenticate, requireRole(ADMIN, SALES, WAREHOUSE), h(uploadController.uploadImage));

export default r;
