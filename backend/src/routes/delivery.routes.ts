import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { getPool, withTransaction } from '../config/database';
import sql from 'mssql';
import { AppError } from '../errors/AppError';
import { userRepository } from '../repositories/user.repository';

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

  res.json({
    ...invRes.recordset[0],
    items: itemsRes.recordset,
  });
}));

// Xác nhận giao hàng thành công
router.post('/orders/:id/deliver', asyncHandler(async (req, res) => {
  const invoiceId = Number(req.params.id);
  const userId = req.user!.userId;

  const user = await userRepository.findActiveById(userId);
  const employeeId = user?.employeeId || null;

  await withTransaction(async (tx) => {
    const request = new sql.Request(tx);

    const updateResult = await request
      .input('id', sql.Int, invoiceId)
      .input('empId', sql.Int, employeeId)
      .query(`
        UPDATE invoices 
        SET order_status = 'DELIVERED', 
            shipper_employee_id = @empId
        WHERE invoice_id = @id AND order_status = 'SHIPPING' AND is_deleted = 0
      `);

    if (updateResult.rowsAffected[0] === 0) {
      throw AppError.badRequest('Đơn hàng không tồn tại, không ở trạng thái vận chuyển hoặc đã được giao.');
    }

    const historyRequest = new sql.Request(tx);
    await historyRequest
      .input('invId', sql.Int, invoiceId)
      .input('uId', sql.Int, userId)
      .query(`
        INSERT INTO order_status_history (invoice_id, old_status, new_status, changed_by, note)
        VALUES (@invId, 'SHIPPING', 'DELIVERED', @uId, N'Nhân viên xác nhận giao hàng thành công trên Mobile')
      `);
  });

  res.json({ message: 'Xác nhận giao hàng thành công' });
}));

export default router;
