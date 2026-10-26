import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { getPool } from '../config/database';
import sql from 'mssql';
import { AppError } from '../errors/AppError';
import { orderService } from '../services/order.service';
import { paymentRepository } from '../repositories/payment.repository';

const router = Router();

router.use(authenticate);
router.use(requireRole('SALES', 'ADMIN'));

// Lấy danh sách đơn hàng đang vận chuyển (SHIPPING)
router.get('/orders', asyncHandler(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT 
      invoice_id AS invoiceId,
      invoice_date AS invoiceDate,
      channel,
      receiver_name AS receiverName,
      receiver_phone AS receiverPhone,
      shipping_address AS shippingAddress,
      total_amount AS totalAmount,
      discount_amount AS discountAmount,
      (total_amount - discount_amount) AS amountPayable,
      order_status AS orderStatus
    FROM invoices
    WHERE order_status = 'SHIPPING' AND is_deleted = 0
    ORDER BY invoice_date DESC
  `);

  res.json({
    items: result.recordset,
    total: result.recordset.length,
  });
}));

// Lấy chi tiết đơn hàng cho giao diện giao hàng
router.get('/orders/:id', asyncHandler(async (req, res) => {
  const invoiceId = Number(req.params.id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    throw AppError.badRequest('Mã đơn hàng không hợp lệ');
  }
  const pool = await getPool();

  const invRes = await pool.request()
    .input('id', sql.Int, invoiceId)
    .query(`
      SELECT 
        invoice_id AS invoiceId,
        invoice_date AS invoiceDate,
        channel,
        receiver_name AS receiverName,
        receiver_phone AS receiverPhone,
        shipping_address AS shippingAddress,
        total_amount AS totalAmount,
        discount_amount AS discountAmount,
        (total_amount - discount_amount) AS amountPayable,
        order_status AS orderStatus
      FROM invoices
      WHERE invoice_id = @id AND is_deleted = 0
    `);

  if (!invRes.recordset.length) {
    throw AppError.notFound('Không tìm thấy đơn hàng');
  }

  const itemsRes = await pool.request()
    .input('id', sql.Int, invoiceId)
    .query(`
      SELECT 
        d.variant_id AS variantId,
        p.product_name AS productName,
        s.size_label AS sizeLabel,
        c.color_name AS colorName,
        d.quantity,
        d.sale_price AS salePrice,
        d.line_total AS lineTotal
      FROM invoice_details d
      JOIN product_variants v ON v.variant_id = d.variant_id
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes s ON s.size_id = v.size_id
      JOIN colors c ON c.color_id = v.color_id
      WHERE d.invoice_id = @id
    `);

  // Giao dịch thanh toán: màn chi tiết trên mobile cần mảng này (methodCode, methodName, amount, status, paymentId)
  const payments = await paymentRepository.listByInvoice(invoiceId);

  res.json({
    ...invRes.recordset[0],
    items: itemsRes.recordset,
    payments,
  });
}));

// Xác nhận giao hàng thành công.
// Đi qua orderService.deliver -> sp_change_order_status: kiểm tra luồng SHIPPING -> DELIVERED, khóa dòng đơn,
// trigger tự ghi lịch sử (changed_by = người giao) và service cộng total_purchased cho khách.
// Sau đó ghi shipper_employee_id (migration 003_shipper_employee.sql).
router.post('/orders/:id/deliver', asyncHandler(async (req, res) => {
  const invoiceId = Number(req.params.id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    throw AppError.badRequest('Mã đơn hàng không hợp lệ');
  }

  await orderService.deliver(req.user!, invoiceId, 'Nhân viên xác nhận giao hàng thành công trên Mobile');

  // Ghi nhân viên giao hàng (cột shipper_employee_id từ migration 003). Không đổi trạng thái nên trigger bỏ qua.
  const shipperId = req.user!.employeeId ?? null;
  if (shipperId) {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, invoiceId)
      .input('empId', sql.Int, shipperId)
      .query(`UPDATE invoices SET shipper_employee_id = @empId WHERE invoice_id = @id AND is_deleted = 0`);
  }

  res.json({ message: 'Xác nhận giao hàng thành công' });
}));

export default router;
