const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'ShoeStore',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: { encrypt: false, trustServerCertificate: true },
};

async function seedOrdersForRiaz() {
  const pool = await sql.connect(config);
  
  const u = await pool.request().query("SELECT user_id, customer_id FROM users WHERE username = 'Riaz' AND is_deleted = 0");
  if (!u.recordset.length) throw new Error('User Riaz not found');
  const userId = u.recordset[0].user_id;
  const customerId = u.recordset[0].customer_id;

  const addr = await pool.request().input('c', sql.Int, customerId)
    .query('SELECT TOP 1 * FROM customer_addresses WHERE customer_id = @c AND is_deleted = 0');
  const a = addr.recordset[0];
  const fullAddr = `${a.street_detail}, ${a.ward}, ${a.district}, ${a.province}`;

  const vars = await pool.request().query(
    "SELECT TOP 3 v.variant_id, v.sku, p.product_name, p.current_price FROM product_variants v JOIN products p ON p.product_id = v.product_id WHERE v.stock_quantity > 0 AND v.is_deleted = 0 AND p.is_deleted = 0 AND p.is_active = 1 ORDER BY v.variant_id DESC"
  );

  const admin = await pool.request().query("SELECT user_id FROM users WHERE username = 'admin'");
  const adminId = admin.recordset[0]?.user_id || 1;

  const methods = await pool.request().query("SELECT method_id, method_code FROM payment_methods WHERE is_active = 1 AND is_deleted = 0");
  const bankMethod = methods.recordset.find(m => m.method_code === 'BANK_TRANSFER') || methods.recordset[0];
  const cashMethod = methods.recordset.find(m => m.method_code === 'CASH') || methods.recordset[0];

  // Đơn 1: Chuyển khoản ngân hàng - PENDING (để test tải ảnh chứng từ thanh toán M9)
  const tx1 = new sql.Transaction(pool);
  await tx1.begin();
  try {
    const run = () => new sql.Request(tx1);
    await run().input('u', sql.Int, userId).query(`EXEC sp_set_session_context @key = N'user_id', @value = @u`);
    const inv = await run().input('c', sql.Int, customerId).input('a', sql.Int, a.address_id).input('rn', sql.NVarChar(100), a.receiver_name)
      .input('rp', sql.VarChar(20), a.receiver_phone).input('sa', sql.NVarChar(500), fullAddr).input('n', sql.NVarChar(500), 'Đơn chuyển khoản test M9')
      .query(`INSERT INTO invoices (channel, customer_id, shipping_address_id, receiver_name, receiver_phone, shipping_address, note)
              VALUES ('ONLINE', @c, @a, @rn, @rp, @sa, @n); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
    const invoiceId = inv.recordset[0].id;

    const v = vars.recordset[0];
    const unit = Number(v.current_price);
    await run().input('i', sql.Int, invoiceId).input('v', sql.Int, v.variant_id).input('q', sql.Int, 1)
      .input('p', sql.Decimal(18, 2), unit).input('d', sql.Decimal(18, 2), 0)
      .query('INSERT INTO invoice_details (invoice_id, variant_id, quantity, sale_price, discount_amount) VALUES (@i, @v, @q, @p, @d)');

    const tot = await run().input('i', sql.Int, invoiceId).query('SELECT total_amount FROM invoices WHERE invoice_id = @i');
    const payable = Number(tot.recordset[0].total_amount);

    await run().input('i', sql.Int, invoiceId).input('m', sql.Int, bankMethod.method_id).input('a', sql.Decimal(18, 2), payable)
      .query(`INSERT INTO payments (invoice_id, method_id, amount, status)
              VALUES (@i, @m, @a, 'PENDING')`);

    await tx1.commit();
    console.log(`Đã tạo đơn #${invoiceId} (Chuyển khoản - PENDING) cho ${u.recordset[0].username}`);
  } catch (e) {
    await tx1.rollback();
    throw e;
  }

  // Đơn 2: Thanh toán thất bại FAILED (để test nút Thanh toán lại / Retry M9)
  const tx2 = new sql.Transaction(pool);
  await tx2.begin();
  try {
    const run = () => new sql.Request(tx2);
    await run().input('u', sql.Int, userId).query(`EXEC sp_set_session_context @key = N'user_id', @value = @u`);
    const inv = await run().input('c', sql.Int, customerId).input('a', sql.Int, a.address_id).input('rn', sql.NVarChar(100), a.receiver_name)
      .input('rp', sql.VarChar(20), a.receiver_phone).input('sa', sql.NVarChar(500), fullAddr).input('n', sql.NVarChar(500), 'Đơn giao dịch FAILED để test retryPay')
      .query(`INSERT INTO invoices (channel, customer_id, shipping_address_id, receiver_name, receiver_phone, shipping_address, note)
              VALUES ('ONLINE', @c, @a, @rn, @rp, @sa, @n); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
    const invoiceId = inv.recordset[0].id;

    const v = vars.recordset[1] || vars.recordset[0];
    const unit = Number(v.current_price);
    await run().input('i', sql.Int, invoiceId).input('v', sql.Int, v.variant_id).input('q', sql.Int, 1)
      .input('p', sql.Decimal(18, 2), unit).input('d', sql.Decimal(18, 2), 0)
      .query('INSERT INTO invoice_details (invoice_id, variant_id, quantity, sale_price, discount_amount) VALUES (@i, @v, @q, @p, @d)');

    const tot = await run().input('i', sql.Int, invoiceId).query('SELECT total_amount FROM invoices WHERE invoice_id = @i');
    const payable = Number(tot.recordset[0].total_amount);

    await run().input('i', sql.Int, invoiceId).input('m', sql.Int, cashMethod.method_id).input('a', sql.Decimal(18, 2), payable)
      .query(`INSERT INTO payments (invoice_id, method_id, amount, status, note)
              VALUES (@i, @m, @a, 'FAILED', N'Hết hạn giao dịch (mẫu để test thanh toán lại)')`);

    await tx2.commit();
    console.log(`Đã tạo đơn #${invoiceId} (Giao dịch FAILED - test nút Thanh toán lại M9) cho ${u.recordset[0].username}`);
  } catch (e) {
    await tx2.rollback();
    throw e;
  }

  await pool.close();
  console.log('HOÀN TẤT!');
}

seedOrdersForRiaz().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
