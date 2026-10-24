import { Router } from 'express';
import { ROLES } from '../constants/auth.constant';
import { invoiceController as c } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler as h } from '../utils/asyncHandler';
import { idParam } from '../validators/common';
import { invoiceListQuery } from '../validators/order.validator';

/**
 * /api/v1/invoices – Quản lý hóa đơn. Admin: đầy đủ (kèm thống kê doanh thu, người xử lý hoàn tiền).
 * Bán hàng: CHỈ XEM danh sách, chi tiết và in; không có thống kê doanh thu, không thấy người xử lý hoàn tiền.
 */
const r = Router();
r.use(authenticate, requireRole(ROLES.ADMIN, ROLES.SALES));
r.get('/', validate(invoiceListQuery, 'query'), h(c.list));
r.get('/:id', validate(idParam, 'params'), h(c.get));
r.get('/:id/print', validate(idParam, 'params'), h(c.print));
export default r;
