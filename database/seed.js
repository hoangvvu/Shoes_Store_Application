/**
 * database/seed.js – dữ liệu mẫu để TEST M1 (xác thực & tài khoản), M2 (khách hàng & địa chỉ), M7 (giỏ hàng), M8 (đặt hàng) và M14 (đánh giá, yêu thích), kèm thông tin cá nhân (giới tính, email, ngày sinh…) để thử tìm kiếm nâng cao.
 *
 * Cách chạy:   cd database && npm i && npm run seed
 * Tùy chọn:    npm run seed -- --reset-passwords   (đặt lại mật khẩu các tài khoản mẫu)
 *
 * Yêu cầu: đã chạy shoestore_schema.sql và migrations/001_roles_sales_warehouse.sql.
 * An toàn chạy lại nhiều lần (idempotent). Chỉ dùng cho môi trường phát triển.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') }); // dùng chung cấu hình backend
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const BCRYPT_COST = 12; // trùng backend/src/constants/auth.constant.ts
const resetPasswords = process.argv.includes('--reset-passwords');

/**
 * Mỗi tài khoản gắn với một tình huống test M1.
 * kind: 'EMPLOYEE' | 'CUSTOMER'
 */
const ACCOUNTS = [
  { username: 'admin',        password: 'Admin@12345',  role: 'ADMIN',     kind: 'EMPLOYEE', lastName: 'Quản Trị', firstName: 'Viên',       phone: '0901000001', salary: 20000000, note: 'Đăng nhập web → layout Admin; thấy baseSalary trong GET /me' },
  { username: 'sales01',      password: 'Sales@12345',  role: 'SALES',     kind: 'EMPLOYEE', lastName: 'Nhân Viên', firstName: 'Bán Hàng',  phone: '0901000002', salary: 9000000,  note: 'Web → layout Bán hàng; KHÔNG thấy lương' },
  { username: 'warehouse01',  password: 'Kho@12345',    role: 'WAREHOUSE', kind: 'EMPLOYEE', lastName: 'Nhân Viên', firstName: 'Kho',       phone: '0901000003', salary: 9000000,  note: 'Web → layout Kho; KHÔNG thấy lương' },
  { username: 'sales_locked', password: 'Sales@12345',  role: 'SALES',     kind: 'EMPLOYEE', lastName: 'NV', firstName: 'Bị Khóa',          phone: '0901000004', salary: 0, locked: true, note: 'Đăng nhập phải báo "Sai tên đăng nhập hoặc mật khẩu" (tài khoản bị khóa)' },
  { username: 'khach01',      password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', lastName: 'Khách Hàng', firstName: 'Mẫu',      phone: '0900000001', note: 'Đăng nhập mobile; thử đổi hồ sơ/mật khẩu' },
  { username: 'khach02',      password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', lastName: 'Khách Hàng', firstName: 'Thứ Hai',  phone: '0900000002', note: 'Thử sửa SĐT thành 0900000001 → 409 PHONE_TAKEN' },
  { username: 'khach_locked', password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', lastName: 'Khách', firstName: 'Bị Khóa',       phone: '0900000003', locked: true, note: 'Đăng nhập mobile phải bị từ chối (tài khoản khóa)' },
  { username: 'khach_cu',     password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', lastName: 'Khách', firstName: 'Đã Xóa Mềm',    phone: '0900000004', deleted: true, note: 'Đã xóa mềm: không đăng nhập được; đăng ký lại username "khach_cu" + SĐT 0900000004 phải thành công' },
];

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'ShoeStore',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
  },
};

async function getRoleId(executor, name) {
  const r = await new sql.Request(executor).input('n', sql.VarChar(30), name)
    .query('SELECT role_id FROM roles WHERE role_name = @n');
  if (!r.recordset.length) {
    throw new Error(`Thiếu role ${name}. Hãy chạy database/migrations/001_roles_sales_warehouse.sql trước.`);
  }
  return r.recordset[0].role_id;
}

async function seedAccount(pool, a) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const exists = await new sql.Request(tx)
      .input('u', sql.NVarChar(50), a.username)
      .query('SELECT user_id FROM users WHERE username = @u AND is_deleted = ' + (a.deleted ? '1' : '0'));

    if (exists.recordset.length) {
      if (resetPasswords) {
        const hash = await bcrypt.hash(a.password, BCRYPT_COST);
        await new sql.Request(tx).input('h', sql.VarChar(255), hash).input('id', sql.Int, exists.recordset[0].user_id)
          .query('UPDATE users SET password_hash = @h WHERE user_id = @id');
        await tx.commit();
        return 'đặt lại mật khẩu';
      }
      await tx.commit();
      return 'đã có';
    }

    const roleId = await getRoleId(tx, a.role);
    const hash = await bcrypt.hash(a.password, BCRYPT_COST);
    let employeeId = null;
    let customerId = null;

    if (a.kind === 'EMPLOYEE') {
      const e = await new sql.Request(tx)
        .input('ln', sql.NVarChar(50), a.lastName).input('fn', sql.NVarChar(50), a.firstName)
        .input('p', sql.VarChar(20), a.phone)
        .input('s', sql.Decimal(18, 2), a.salary || 0)
        .query(`INSERT INTO employees (last_name, first_name, phone, base_salary, is_deleted, deleted_at)
                VALUES (@ln, @fn, @p, @s, ${a.deleted ? 1 : 0}, ${a.deleted ? 'SYSUTCDATETIME()' : 'NULL'});
                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
      employeeId = e.recordset[0].id;
    } else {
      const c = await new sql.Request(tx)
        .input('ln', sql.NVarChar(50), a.lastName).input('fn', sql.NVarChar(50), a.firstName)
        .input('p', sql.VarChar(20), a.phone)
        .query(`INSERT INTO customers (last_name, first_name, phone, is_deleted, deleted_at)
                VALUES (@ln, @fn, @p, ${a.deleted ? 1 : 0}, ${a.deleted ? 'SYSUTCDATETIME()' : 'NULL'});
                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
      customerId = c.recordset[0].id;
    }

    await new sql.Request(tx)
      .input('u', sql.NVarChar(50), a.username).input('h', sql.VarChar(255), hash)
      .input('r', sql.Int, roleId).input('t', sql.VarChar(10), a.kind)
      .input('e', sql.Int, employeeId).input('c', sql.Int, customerId)
      .input('l', sql.Bit, a.locked ? 1 : 0).input('d', sql.Bit, a.deleted ? 1 : 0)
      .query(`INSERT INTO users (username, password_hash, role_id, user_type, employee_id, customer_id, is_locked, is_deleted, deleted_at)
              VALUES (@u, @h, @r, @t, @e, @c, @l, @d, CASE WHEN @d = 1 THEN SYSUTCDATETIME() ELSE NULL END)`);
    await tx.commit();
    return 'đã tạo';
  } catch (err) {
    try { await tx.rollback(); } catch { /* đã rollback */ }
    throw err;
  }
}

/* ---------------- M2: khách tại quầy, khách để test phân trang, địa chỉ ---------------- */
const WALK_IN = [
  { lastName: 'Khách', firstName: 'Tại Quầy', phone: '0900000005' }, // không có tài khoản -> badge "Tại quầy"
  ...Array.from({ length: 12 }, (_, i) => ({
    lastName: 'Khách',
    firstName: `Mẫu ${String(i + 1).padStart(2, '0')}`,
    phone: `09100000${String(i + 1).padStart(2, '0')}`, // đủ nhiều để test phân trang (size = 10) và tìm kiếm
  })),
];

const ADDRESSES = {
  khach01: [
    { label: 'HOME', name: 'Khách Hàng Mẫu', phone: '0900000001', province: 'TP. Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Bến Nghé', street: '12 Lê Lợi', isDefault: true },
    { label: 'OFFICE', name: 'Khách Hàng Mẫu', phone: '0900000001', province: 'TP. Hồ Chí Minh', district: 'Quận 3', ward: 'Phường Võ Thị Sáu', street: '88 Nam Kỳ Khởi Nghĩa', isDefault: false },
  ],
  khach02: [
    // để test IDOR: khach01 không được xem/sửa/xóa địa chỉ này
    { label: 'HOME', name: 'Khách Hàng Thứ Hai', phone: '0900000002', province: 'Hà Nội', district: 'Quận Ba Đình', ward: 'Phường Điện Biên', street: '5 Hùng Vương', isDefault: true },
  ],
};

async function seedWalkIn(pool, c) {
  const exists = await pool.request().input('p', sql.VarChar(20), c.phone)
    .query('SELECT 1 AS x FROM customers WHERE phone = @p AND is_deleted = 0');
  if (exists.recordset.length) return false;
  await pool.request()
    .input('ln', sql.NVarChar(50), c.lastName).input('fn', sql.NVarChar(50), c.firstName)
    .input('p', sql.VarChar(20), c.phone)
    .query('INSERT INTO customers (last_name, first_name, phone) VALUES (@ln, @fn, @p)');
  return true;
}

async function seedAddresses(pool, username, list) {
  const u = await pool.request().input('u', sql.NVarChar(50), username)
    .query('SELECT customer_id FROM users WHERE username = @u AND is_deleted = 0 AND customer_id IS NOT NULL');
  if (!u.recordset.length) return 'bỏ qua (chưa có tài khoản)';
  const customerId = u.recordset[0].customer_id;
  const has = await pool.request().input('c', sql.Int, customerId)
    .query('SELECT COUNT(*) AS n FROM customer_addresses WHERE customer_id = @c AND is_deleted = 0');
  if (has.recordset[0].n > 0) return 'đã có';
  for (const a of list) {
    await pool.request()
      .input('c', sql.Int, customerId).input('l', sql.VarChar(10), a.label)
      .input('n', sql.NVarChar(100), a.name).input('p', sql.VarChar(20), a.phone)
      .input('pr', sql.NVarChar(100), a.province).input('d', sql.NVarChar(100), a.district)
      .input('w', sql.NVarChar(100), a.ward).input('s', sql.NVarChar(255), a.street)
      .input('def', sql.Bit, a.isDefault ? 1 : 0)
      .query(`INSERT INTO customer_addresses (customer_id, label, receiver_name, receiver_phone, province, district, ward, street_detail, is_default)
              VALUES (@c, @l, @n, @p, @pr, @d, @w, @s, @def)`);
  }
  return `đã tạo ${list.length}`;
}

/* ---------------- M7: sản phẩm test (tạm, chờ M4) + giỏ hàng mẫu ---------------- */
// Chỉ để thử giỏ hàng. Khi M4 có dữ liệu thật, bỏ các SKU bắt đầu bằng TEST- là được.
const TEST_VARIANTS = [
  { sku: 'TEST-OK-40',  product: 'Giày Test – Còn hàng',   price: 1250000, size: '40', color: 'Đen',   stock: 20, active: 1, cat: 'Giày Sneaker', brand: 'Nike' },
  { sku: 'TEST-OK-41',  product: 'Giày Test – Còn hàng',   price: 1250000, size: '41', color: 'Đen',   stock: 20, active: 1, cat: 'Giày Sneaker', brand: 'Nike' },
  { sku: 'TEST-LOW-39', product: 'Giày Test – Sắp hết',    price: 890000,  size: '39', color: 'Trắng', stock: 3,  active: 1, cat: 'Giày Chạy Bộ', brand: 'Adidas' },
  { sku: 'TEST-OUT-42', product: 'Giày Test – Hết hàng',   price: 990000,  size: '42', color: 'Xám',   stock: 0,  active: 1, cat: 'Giày Thể Thao', brand: 'Puma' },
  { sku: 'TEST-OFF-40', product: 'Giày Test – Ngừng bán',  price: 750000,  size: '40', color: 'Đỏ',    stock: 5,  active: 0, cat: 'Giày Sneaker', brand: 'Converse' },
];

// Giỏ của khach01: đủ 4 trạng thái để thấy cảnh báo trên màn hình giỏ
const CART_KHACH01 = [
  { sku: 'TEST-OK-40',  qty: 2 }, // OK
  { sku: 'TEST-LOW-39', qty: 5 }, // INSUFFICIENT_STOCK (kho còn 3)
  { sku: 'TEST-OUT-42', qty: 1 }, // OUT_OF_STOCK
  { sku: 'TEST-OFF-40', qty: 1 }, // UNAVAILABLE (sản phẩm ngừng bán)
];

async function ensureCatalogAndSuppliers(pool) {
  // Sizes
  const sizes = [
    { label: '38', order: 38 },
    { label: '39', order: 39 },
    { label: '40', order: 40 },
    { label: '41', order: 41 },
    { label: '42', order: 42 },
    { label: '43', order: 43 },
    { label: '44', order: 44 },
  ];
  for (const s of sizes) {
    const ex = await pool.request().input('l', sql.VarChar(10), s.label)
      .query('SELECT 1 FROM sizes WHERE size_label = @l AND is_deleted = 0');
    if (!ex.recordset.length) {
      await pool.request().input('l', sql.VarChar(10), s.label).input('o', sql.Int, s.order)
        .query('INSERT INTO sizes (size_label, sort_order) VALUES (@l, @o)');
    }
  }

  // Colors
  const colors = [
    { name: 'Đen', hex: '#000000' },
    { name: 'Trắng', hex: '#FFFFFF' },
    { name: 'Xám', hex: '#808080' },
    { name: 'Đỏ', hex: '#FF0000' },
    { name: 'Xanh', hex: '#0000FF' },
  ];
  for (const c of colors) {
    const ex = await pool.request().input('n', sql.NVarChar(30), c.name)
      .query('SELECT 1 FROM colors WHERE color_name = @n AND is_deleted = 0');
    if (!ex.recordset.length) {
      await pool.request().input('n', sql.NVarChar(30), c.name).input('h', sql.VarChar(7), c.hex)
        .query('INSERT INTO colors (color_name, hex_code) VALUES (@n, @h)');
    }
  }

  // Categories
  const cats = ['Giày Thể Thao', 'Giày Chạy Bộ', 'Giày Sneaker', 'Giày Sandal'];
  for (const name of cats) {
    const ex = await pool.request().input('n', sql.NVarChar(100), name)
      .query('SELECT 1 FROM categories WHERE category_name = @n AND is_deleted = 0');
    if (!ex.recordset.length) {
      await pool.request().input('n', sql.NVarChar(100), name)
        .query('INSERT INTO categories (category_name) VALUES (@n)');
    }
  }

  // Brands
  const brands = ['Nike', 'Adidas', 'Puma', 'Converse', 'Vans'];
  for (const name of brands) {
    const ex = await pool.request().input('n', sql.NVarChar(100), name)
      .query('SELECT 1 FROM brands WHERE brand_name = @n AND is_deleted = 0');
    if (!ex.recordset.length) {
      await pool.request().input('n', sql.NVarChar(100), name)
        .query('INSERT INTO brands (brand_name) VALUES (@n)');
    }
  }

  // Suppliers
  const suppliers = [
    { name: 'Công Ty TNHH Nike Việt Nam', phone: '0283800001', email: 'contact@nike.vn', address: 'Quận 1, TP. HCM' },
    { name: 'Nhà Phân Phối Thể Thao An Hưng', phone: '0243800002', email: 'sales@anhung.vn', address: 'Cầu Giấy, Hà Nội' },
    { name: 'Tổng Kho Giày Miền Nam', phone: '0283800003', email: 'kho@giaymiennam.com', address: 'Bình Tân, TP. HCM' },
  ];
  for (const s of suppliers) {
    const ex = await pool.request().input('n', sql.NVarChar(150), s.name)
      .query('SELECT 1 FROM suppliers WHERE supplier_name = @n AND is_deleted = 0');
    if (!ex.recordset.length) {
      await pool.request().input('n', sql.NVarChar(150), s.name).input('p', sql.VarChar(20), s.phone)
        .input('e', sql.VarChar(100), s.email).input('a', sql.NVarChar(255), s.address)
        .query('INSERT INTO suppliers (supplier_name, phone, email, address) VALUES (@n, @p, @e, @a)');
    }
  }
}

async function seedTestCatalog(pool) {
  await ensureCatalogAndSuppliers(pool);
  const admin = await pool.request().query(`SELECT user_id FROM users WHERE username = 'admin' AND is_deleted = 0`);
  if (!admin.recordset.length) throw new Error('Cần tài khoản admin (seed ở phần M1) để ghi sổ kho.');
  const adminId = admin.recordset[0].user_id;
  const ids = {};
  for (const v of TEST_VARIANTS) {
    const ex = await pool.request().input('s', sql.VarChar(50), v.sku)
      .query('SELECT variant_id FROM product_variants WHERE sku = @s AND is_deleted = 0');
    if (ex.recordset.length) { ids[v.sku] = ex.recordset[0].variant_id; continue; }

    const size = await pool.request().input('l', sql.VarChar(10), v.size).query('SELECT size_id FROM sizes WHERE size_label = @l AND is_deleted = 0');
    const color = await pool.request().input('n', sql.NVarChar(30), v.color).query('SELECT color_id FROM colors WHERE color_name = @n AND is_deleted = 0');
    if (!size.recordset.length || !color.recordset.length) throw new Error(`Thiếu size ${v.size} hoặc màu ${v.color} trong dữ liệu khởi tạo.`);

    // dùng chung 1 product cho các biến thể cùng tên
    let p = await pool.request().input('n', sql.NVarChar(200), v.product)
      .query('SELECT product_id FROM products WHERE product_name = @n AND is_deleted = 0');
    if (!p.recordset.length) {
      const catRes = v.cat ? await pool.request().input('cn', sql.NVarChar(100), v.cat).query('SELECT category_id FROM categories WHERE category_name = @cn') : { recordset: [] };
      const brandRes = v.brand ? await pool.request().input('bn', sql.NVarChar(100), v.brand).query('SELECT brand_id FROM brands WHERE brand_name = @bn') : { recordset: [] };
      const catId = catRes.recordset[0]?.category_id || null;
      const brandId = brandRes.recordset[0]?.brand_id || null;
      p = await pool.request()
        .input('n', sql.NVarChar(200), v.product)
        .input('cat', sql.Int, catId)
        .input('brand', sql.Int, brandId)
        .input('pr', sql.Decimal(18, 2), v.price)
        .input('a', sql.Bit, v.active)
        .query('INSERT INTO products (product_name, category_id, brand_id, current_price, is_active) VALUES (@n, @cat, @brand, @pr, @a); SELECT SCOPE_IDENTITY() AS product_id;');
    }
    const vr = await pool.request().input('p', sql.Int, p.recordset[0].product_id).input('sz', sql.Int, size.recordset[0].size_id)
      .input('c', sql.Int, color.recordset[0].color_id).input('s', sql.VarChar(50), v.sku)
      .query('INSERT INTO product_variants (product_id, size_id, color_id, sku) VALUES (@p, @sz, @c, @s); SELECT SCOPE_IDENTITY() AS variant_id;');
    const variantId = Number(vr.recordset[0].variant_id);
    ids[v.sku] = variantId;

    if (v.stock > 0) {
      // tồn kho chỉ được đổi qua sổ kho (trigger chặn sửa stock_quantity trực tiếp)
      await pool.request().input('v', sql.Int, variantId).input('q', sql.Int, v.stock).input('u', sql.Int, adminId)
        .query(`INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, created_by)
                VALUES (@v, 'ADJUST_IN', @q, N'Seed dữ liệu test giỏ hàng', @u)`);
    }
  }
  return ids;
}

async function seedCart(pool, username, lines, ids) {
  const u = await pool.request().input('u', sql.NVarChar(50), username)
    .query('SELECT customer_id FROM users WHERE username = @u AND is_deleted = 0 AND customer_id IS NOT NULL');
  if (!u.recordset.length) return 'bỏ qua (chưa có tài khoản)';
  const customerId = u.recordset[0].customer_id;
  const has = await pool.request().input('c', sql.Int, customerId)
    .query(`SELECT 1 AS x FROM carts WHERE customer_id = @c AND status = 'ACTIVE' AND is_deleted = 0`);
  if (has.recordset.length) return 'đã có giỏ';
  const cart = await pool.request().input('c', sql.Int, customerId)
    .query('INSERT INTO carts (customer_id) VALUES (@c); SELECT SCOPE_IDENTITY() AS id;');
  for (const l of lines) {
    await pool.request().input('cart', sql.Int, Number(cart.recordset[0].id)).input('v', sql.Int, ids[l.sku]).input('q', sql.Int, l.qty)
      .query('INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (@cart, @v, @q)');
  }
  return `đã tạo giỏ ${lines.length} dòng`;
}

/* ---------------- M8: khuyến mãi / voucher test + đơn hàng mẫu ---------------- */
// Tạm để thử tính giá khi đặt hàng. Quản lý khuyến mãi thật là phần M11; bỏ các dòng có tên bắt đầu "TEST M8".
const TODAY_VN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time' AS DATE)`;

async function ensurePromotion(pool, name, type) {
  const ex = await pool.request().input('n', sql.NVarChar(150), name)
    .query('SELECT promotion_id FROM promotions WHERE promotion_name = @n AND is_deleted = 0');
  if (ex.recordset.length) return { id: ex.recordset[0].promotion_id, created: false };
  const r = await pool.request().input('n', sql.NVarChar(150), name).input('t', sql.VarChar(10), type)
    .query(`INSERT INTO promotions (promotion_name, promo_type, start_date, end_date)
            VALUES (@n, @t, DATEADD(DAY, -1, ${TODAY_VN}), DATEADD(DAY, 365, ${TODAY_VN}));
            SELECT SCOPE_IDENTITY() AS id;`);
  return { id: Number(r.recordset[0].id), created: true };
}

async function seedPromotions(pool, ids) {
  // 1) Giảm 10% sản phẩm "Giày Test – Còn hàng" (dòng hàng)
  const p1 = await ensurePromotion(pool, 'TEST M8 – Giảm 10% giày test', 'PRODUCT');
  if (p1.created) {
    await pool.request().input('p', sql.Int, p1.id).input('v', sql.Int, ids['TEST-OK-40'])
      .query(`INSERT INTO promotion_products (promotion_id, product_id, discount_percent)
              SELECT @p, product_id, 10 FROM product_variants WHERE variant_id = @v`);
  }
  // 2) Hóa đơn từ 2.000.000đ giảm 5%
  const p2 = await ensurePromotion(pool, 'TEST M8 – Hóa đơn từ 2 triệu giảm 5%', 'INVOICE');
  if (p2.created) {
    await pool.request().input('p', sql.Int, p2.id)
      .query('INSERT INTO promotion_invoice_tiers (promotion_id, min_invoice_amount, discount_percent) VALUES (@p, 2000000, 5)');
  }
  // 3) Voucher: TEST10 (giảm 10%, tối đa 5 lượt) và TESTFULL (đã dùng hết lượt, để thử lỗi)
  const p3 = await ensurePromotion(pool, 'TEST M8 – Voucher giảm 10%', 'VOUCHER');
  if (p3.created) {
    await pool.request().input('p', sql.Int, p3.id).query(`
      INSERT INTO promotion_vouchers (promotion_id, voucher_code, discount_percent, usage_limit, used_count) VALUES
        (@p, 'TEST10', 10, 5, 0),
        (@p, 'TESTFULL', 10, 1, 1)`);
  }
  return [p1, p2, p3].filter((x) => x.created).length;
}

const SEED_ORDERS = [
  { tag: 'SEED-M8-PENDING',   steps: [],                                     lines: [['TEST-OK-41', 1]] },
  { tag: 'SEED-M8-CONFIRMED', steps: ['CONFIRMED'],                          lines: [['TEST-OK-40', 1]] },
  { tag: 'SEED-M8-DELIVERED', steps: ['CONFIRMED', 'SHIPPING', 'DELIVERED'], lines: [['TEST-OK-41', 2]], paid: true },
  { tag: 'SEED-M8-CANCELLED', steps: ['CANCELLED'],                          lines: [['TEST-LOW-39', 1]] },
];

async function seedOrders(pool, ids) {
  const u = await pool.request().query(`SELECT u.user_id AS uid, u.customer_id AS cid FROM users u WHERE u.username = 'khach01' AND u.is_deleted = 0`);
  const adm = await pool.request().query(`SELECT user_id FROM users WHERE username = 'admin' AND is_deleted = 0`);
  if (!u.recordset.length || !adm.recordset.length) return 'bỏ qua (thiếu khach01/admin)';
  const { uid, cid } = u.recordset[0];
  const adminId = adm.recordset[0].user_id;
  const addr = await pool.request().input('c', sql.Int, cid)
    .query(`SELECT TOP 1 address_id, receiver_name, receiver_phone, street_detail, ward, district, province
            FROM customer_addresses WHERE customer_id = @c AND is_deleted = 0 ORDER BY is_default DESC, address_id`);
  if (!addr.recordset.length) return 'bỏ qua (khach01 chưa có địa chỉ)';
  const a = addr.recordset[0];
  const fullAddr = [a.street_detail, a.ward, a.district, a.province].join(', ');
  const cash = await pool.request().query(`SELECT method_id FROM payment_methods WHERE method_code = 'CASH'`);
  const methodId = cash.recordset[0].method_id;

  let created = 0;
  for (const o of SEED_ORDERS) {
    const ex = await pool.request().input('n', sql.NVarChar(500), o.tag).query('SELECT 1 AS x FROM invoices WHERE note = @n AND is_deleted = 0');
    if (ex.recordset.length) continue;

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const run = () => new sql.Request(tx);
      await run().input('u', sql.Int, uid).query(`EXEC sp_set_session_context @key = N'user_id', @value = @u`); // trigger ghi người tạo
      const inv = await run().input('c', sql.Int, cid).input('a', sql.Int, a.address_id).input('rn', sql.NVarChar(100), a.receiver_name)
        .input('rp', sql.VarChar(20), a.receiver_phone).input('sa', sql.NVarChar(500), fullAddr).input('n', sql.NVarChar(500), o.tag)
        .query(`INSERT INTO invoices (channel, customer_id, shipping_address_id, receiver_name, receiver_phone, shipping_address, note)
                VALUES ('ONLINE', @c, @a, @rn, @rp, @sa, @n); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
      const invoiceId = inv.recordset[0].id;
      for (const [sku, qty] of o.lines) {
        const price = await run().input('v', sql.Int, ids[sku]).query(
          'SELECT p.current_price FROM product_variants v JOIN products p ON p.product_id = v.product_id WHERE v.variant_id = @v');
        const unit = Number(price.recordset[0].current_price);
        const disc = sku.startsWith('TEST-OK') ? Math.round(unit * qty * 0.1) : 0; // khớp khuyến mãi 10% ở trên
        await run().input('i', sql.Int, invoiceId).input('v', sql.Int, ids[sku]).input('q', sql.Int, qty)
          .input('p', sql.Decimal(18, 2), unit).input('d', sql.Decimal(18, 2), disc)
          .query('INSERT INTO invoice_details (invoice_id, variant_id, quantity, sale_price, discount_amount) VALUES (@i, @v, @q, @p, @d)');
      }
      const tot = await run().input('i', sql.Int, invoiceId).query('SELECT total_amount FROM invoices WHERE invoice_id = @i');
      const payable = Number(tot.recordset[0].total_amount);
      await run().input('i', sql.Int, invoiceId).input('m', sql.Int, methodId).input('a', sql.Decimal(18, 2), payable)
        .input('st', sql.VarChar(10), o.paid ? 'SUCCESS' : 'PENDING')
        .query(`INSERT INTO payments (invoice_id, method_id, amount, status, paid_at)
                VALUES (@i, @m, @a, @st, CASE WHEN @st = 'SUCCESS' THEN SYSUTCDATETIME() END)`);
      for (const st of o.steps) {
        const req = run();
        req.input('invoice_id', sql.Int, invoiceId); req.input('new_status', sql.VarChar(10), st);
        req.input('user_id', sql.Int, st === 'CANCELLED' ? uid : adminId); req.input('note', sql.NVarChar(500), st === 'CANCELLED' ? 'Khách tự hủy đơn (seed)' : 'Seed dữ liệu test');
        await req.execute('dbo.sp_change_order_status');
      }
      if (o.steps.includes('DELIVERED')) {
        await run().input('c', sql.Int, cid).input('a', sql.Decimal(18, 2), payable)
          .query('UPDATE customers SET total_purchased = total_purchased + @a WHERE customer_id = @c'); // đúng quy tắc M8 khi giao xong
      }
      await tx.commit();
      created++;
    } catch (err) {
      try { await tx.rollback(); } catch { /* đã rollback */ }
      throw err;
    }
  }
  return `tạo mới ${created}/${SEED_ORDERS.length} đơn (PENDING / CONFIRMED / DELIVERED / CANCELLED)`;
}

/* ---------------- M14: đánh giá, phản hồi, yêu thích mẫu ---------------- */
// Dùng sản phẩm TEST-* ở M7. Khách mẫu không có tài khoản chỉ để tạo số liệu thống kê sao.
async function customerIdBy(pool, { username, phone }) {
  const r = username
    ? await pool.request().input('u', sql.NVarChar(50), username).query('SELECT customer_id AS id FROM users WHERE username = @u AND is_deleted = 0 AND customer_id IS NOT NULL')
    : await pool.request().input('p', sql.VarChar(20), phone).query('SELECT customer_id AS id FROM customers WHERE phone = @p AND is_deleted = 0');
  return r.recordset[0]?.id ?? null;
}

async function seedReviewsAndFavorites(pool, ids) {
  const productOf = async (sku) =>
    (await pool.request().input('v', sql.Int, ids[sku]).query('SELECT product_id AS id FROM product_variants WHERE variant_id = @v')).recordset[0].id;
  const okP = await productOf('TEST-OK-40');
  const lowP = await productOf('TEST-LOW-39');
  const offP = await productOf('TEST-OFF-40');

  const inv = await pool.request().query(`SELECT invoice_id AS id FROM invoices WHERE note = 'SEED-M8-DELIVERED' AND is_deleted = 0`);
  const deliveredInvoice = inv.recordset[0]?.id ?? null; // đơn đã giao có "Giày Test – Còn hàng" → nhãn "Đã mua hàng"
  const emp = await pool.request().query(`SELECT employee_id AS id FROM users WHERE username = 'sales01' AND is_deleted = 0`);
  const salesEmployeeId = emp.recordset[0]?.id ?? null;

  const REVIEWS = [
    { who: { username: 'khach01' },     product: okP,  rating: 5, status: 'APPROVED', invoice: deliveredInvoice, comment: 'Giày đi rất êm, đúng size, giao nhanh.' },
    { who: { username: 'khach02' },     product: okP,  rating: 4, status: 'APPROVED', comment: 'Đẹp nhưng hơi chật, nên lấy lớn hơn 1 size.', reply: 'Cảm ơn bạn đã góp ý! Lần sau bạn có thể đổi size miễn phí trong 7 ngày nhé.' },
    { who: { phone: '0910000001' },    product: okP,  rating: 5, status: 'APPROVED', comment: 'Đóng gói cẩn thận, chất liệu tốt.' },
    { who: { phone: '0910000002' },    product: okP,  rating: 3, status: 'PENDING',  comment: 'Tạm ổn, đang chờ duyệt (để thử nút Duyệt).' },
    { who: { phone: '0910000003' },    product: okP,  rating: 1, status: 'HIDDEN',   comment: 'Nội dung vi phạm (để thử ẩn / xóa, không tính vào điểm trung bình).' },
    { who: { phone: '0910000004' },    product: lowP, rating: 4, status: 'APPROVED', comment: 'Mẫu này đẹp, tiếc là sắp hết hàng.' },
  ];

  let created = 0;
  for (const r of REVIEWS) {
    const cid = await customerIdBy(pool, r.who);
    if (!cid) continue;
    const has = await pool.request().input('c', sql.Int, cid).input('p', sql.Int, r.product)
      .query('SELECT 1 AS x FROM product_reviews WHERE customer_id = @c AND product_id = @p AND is_deleted = 0');
    if (has.recordset.length) continue;
    const ins = await pool.request().input('c', sql.Int, cid).input('p', sql.Int, r.product).input('i', sql.Int, r.invoice ?? null)
      .input('r', sql.TinyInt, r.rating).input('t', sql.NVarChar(sql.MAX), r.comment).input('s', sql.VarChar(10), r.status)
      .query(`INSERT INTO product_reviews (customer_id, product_id, invoice_id, rating, comment, status)
              VALUES (@c, @p, @i, @r, @t, @s); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
    created++;
    if (r.reply && salesEmployeeId) {
      await pool.request().input('rv', sql.Int, ins.recordset[0].id).input('e', sql.Int, salesEmployeeId).input('t', sql.NVarChar(sql.MAX), r.reply)
        .query('INSERT INTO review_replies (review_id, employee_id, content) VALUES (@rv, @e, @t)');
    }
  }

  // Yêu thích của khach01: 2 sản phẩm đang bán + 1 sản phẩm ngừng bán (phải bị ẩn khỏi danh sách)
  
  // Yêu thích của khach01: 2 sản phẩm đang bán + 1 sản phẩm ngừng bán
  const k1 = await customerIdBy(pool, { username: 'khach01' });
  let favs = 0;

  if (k1) {
    for (const p of [okP, lowP, offP]) {
      const r = await pool.request()
        .input('c', sql.Int, k1)
        .input('p', sql.Int, p)
        .query(`
          IF NOT EXISTS (
            SELECT 1
            FROM favorite_products
            WHERE customer_id = @c
              AND product_id = @p
          )
          BEGIN
            INSERT INTO favorite_products (customer_id, product_id)
            VALUES (@c, @p);

            SELECT 1 AS added;
          END
          ELSE
          BEGIN
            SELECT 0 AS added;
          END
        `);

      if (r.recordset?.[0]?.added === 1) {
        favs++;
      }
    }
  }
  return `tạo mới ${created} đánh giá (APPROVED/PENDING/HIDDEN, có 1 phản hồi, 1 đã mua hàng) và ${favs} sản phẩm yêu thích cho khach01`;
}

/* ---------------- Thông tin cá nhân (migration 002): giới tính, email, ngày sinh, ngày vào làm ---------------- */
// Điền vào các ô còn NULL (không ghi đè dữ liệu đã nhập). Có cả bản ghi để trống hoàn toàn để thử NULL / "Chưa cung cấp".
const d = (ymd) => (ymd ? new Date(`${ymd}T00:00:00.000Z`) : null);

const EMPLOYEE_PROFILE = {
  admin:       { gender: 'MALE',   email: 'admin@ouran.vn',       dob: '1990-04-12', hire: '2022-01-10' },
  sales01:     { gender: 'FEMALE', email: 'sales01@ouran.vn',     dob: '1996-08-21', hire: '2023-03-01' },
  warehouse01: { gender: 'MALE',   email: 'kho01@ouran.vn',       dob: '1993-11-05', hire: '2023-06-15' },
  // sales_locked: để trống toàn bộ
};

const CUSTOMER_PROFILE_BY_USERNAME = {
  khach01: { gender: 'MALE',   email: 'khach01@example.com', dob: '2000-05-20' },
  khach02: { gender: 'FEMALE', email: 'khach02@example.com', dob: '1997-02-14' },
  // khach_locked: để trống toàn bộ
};

// Khách không có tài khoản (nhận diện bằng SĐT) – đa dạng giới tính / tuổi / mức mua để thử bộ lọc
const CUSTOMER_PROFILE_BY_PHONE = {
  '0910000001': { gender: 'FEMALE', dob: '2003-03-10', email: 'a01@example.com', spent: 3200000 },
  '0910000002': { gender: 'MALE',   dob: '1998-07-01', email: null,              spent: 12500000 },
  '0910000003': { gender: 'FEMALE', dob: '1985-09-30', email: 'a03@example.com', spent: 25000000 },
  '0910000004': { gender: 'MALE',   dob: '1979-01-15', email: 'a04@example.com', spent: 800000 },
  '0910000005': { gender: 'OTHER',  dob: '2008-12-25', email: null,              spent: 0 },
  '0910000006': { gender: 'FEMALE', dob: '1992-06-18', email: 'a06@example.com', spent: 7400000 },
  '0910000007': { gender: 'MALE',   dob: '1969-10-02', email: null,              spent: 1900000 },
  '0910000008': { gender: 'FEMALE', dob: '2001-04-04', email: 'a08@example.com', spent: 5000000 },
  '0910000009': { gender: 'MALE',   dob: '1995-11-11', email: 'a09@example.com', spent: 0 },
  '0910000011': { gender: 'FEMALE', dob: '1988-02-29', email: 'a11@example.com', spent: 4300000 },
  '0910000012': { gender: 'MALE',   dob: '2005-08-08', email: 'a12@example.com', spent: 21000000 },
  // 0900000005, 0910000010: để trống toàn bộ ("Chưa cung cấp")
};

async function assertProfileColumns(pool) {
  const r = await pool.request().query(`SELECT COL_LENGTH('customers', 'gender') AS c, COL_LENGTH('employees', 'hire_date') AS e`);
  if (r.recordset[0].c === null || r.recordset[0].e === null) {
    throw new Error('Thiếu cột gender/email/hire_date. Chạy "npm run migrate" (migrations/002_profile_fields.sql) trước khi seed.');
  }
}

async function seedProfileFields(pool) {
  let n = 0;
  for (const [username, p] of Object.entries(EMPLOYEE_PROFILE)) {
    const r = await pool.request().input('u', sql.NVarChar(50), username).input('g', sql.VarChar(10), p.gender).input('e', sql.VarChar(100), p.email)
      .input('b', sql.Date, d(p.dob)).input('h', sql.Date, d(p.hire))
      .query(`UPDATE e SET gender = COALESCE(e.gender, @g), email = COALESCE(e.email, @e),
                           date_of_birth = COALESCE(e.date_of_birth, @b), hire_date = COALESCE(e.hire_date, @h)
              FROM employees e JOIN users u ON u.employee_id = e.employee_id WHERE u.username = @u AND u.is_deleted = 0`);
    n += r.rowsAffected[0] ?? 0;
  }
  for (const [username, p] of Object.entries(CUSTOMER_PROFILE_BY_USERNAME)) {
    const r = await pool.request().input('u', sql.NVarChar(50), username).input('g', sql.VarChar(10), p.gender).input('e', sql.VarChar(100), p.email).input('b', sql.Date, d(p.dob))
      .query(`UPDATE c SET gender = COALESCE(c.gender, @g), email = COALESCE(c.email, @e), date_of_birth = COALESCE(c.date_of_birth, @b)
              FROM customers c JOIN users u ON u.customer_id = c.customer_id WHERE u.username = @u AND u.is_deleted = 0`);
    n += r.rowsAffected[0] ?? 0;
  }
  for (const [phone, p] of Object.entries(CUSTOMER_PROFILE_BY_PHONE)) {
    const r = await pool.request().input('ph', sql.VarChar(20), phone).input('g', sql.VarChar(10), p.gender).input('e', sql.VarChar(100), p.email)
      .input('b', sql.Date, d(p.dob)).input('s', sql.Decimal(18, 2), p.spent)
      .query(`UPDATE customers SET gender = COALESCE(gender, @g), email = COALESCE(email, @e), date_of_birth = COALESCE(date_of_birth, @b),
                     total_purchased = CASE WHEN total_purchased = 0 THEN @s ELSE total_purchased END
              WHERE phone = @ph AND is_deleted = 0`);
    n += r.rowsAffected[0] ?? 0;
  }
  return n;
}

async function main() {
  if (!config.user || !config.password) {
    throw new Error('Thiếu DB_USER / DB_PASSWORD. Tạo backend/.env (hoặc database/.env) trước.');
  }
  const pool = await new sql.ConnectionPool(config).connect();
  await assertProfileColumns(pool);
  console.log(`Seed M1 → ${config.server}/${config.database}\n`);
  for (const a of ACCOUNTS) {
    const status = await seedAccount(pool, a);
    console.log(`  [${status.padEnd(16)}] ${a.username.padEnd(13)} ${a.role.padEnd(10)} ${a.password.padEnd(13)} ${a.note}`);
  }

  console.log('\nM2 – khách & địa chỉ:');
  let created = 0;
  for (const c of WALK_IN) if (await seedWalkIn(pool, c)) created++;
  console.log(`  [khách tại quầy / phân trang] tạo mới ${created}/${WALK_IN.length}`);
  for (const [username, list] of Object.entries(ADDRESSES)) {
    console.log(`  [địa chỉ ${username.padEnd(8)}] ${await seedAddresses(pool, username, list)}`);
  }

  console.log(`  [thông tin cá nhân] đã điền ${await seedProfileFields(pool)} bản ghi (giới tính, email, ngày sinh, ngày vào làm; một số để trống để thử NULL)`);

  console.log('\nM7 – giỏ hàng:');
  const ids = await seedTestCatalog(pool);
  for (const [sku, id] of Object.entries(ids)) console.log(`  [sản phẩm test] ${sku.padEnd(12)} → variantId ${id}`);
  console.log(`  [giỏ khach01] ${await seedCart(pool, 'khach01', CART_KHACH01, ids)}   (khach02: giỏ trống để thử thêm mới)`);

  console.log('\nM8 – khuyến mãi & đơn hàng:');
  console.log(`  [khuyến mãi test] tạo mới ${await seedPromotions(pool, ids)}/3 (giảm 10% giày test · hóa đơn ≥ 2 triệu giảm 5% · voucher TEST10, TESTFULL hết lượt)`);
  console.log(`  [đơn mẫu khach01] ${await seedOrders(pool, ids)}`);

  console.log('\nM14 – đánh giá & yêu thích:');
  console.log(`  [mẫu] ${await seedReviewsAndFavorites(pool, ids)}`);

  console.log('\nXong. Web: admin / sales01 / warehouse01 · Mobile: khach01.');
  await pool.close();
}

main().catch((err) => {
  console.error('Seed lỗi:', err.message);
  process.exit(1);
});
