/**
 * database/seed.js – dữ liệu mẫu để TEST M1 (xác thực & tài khoản), M2 (khách hàng & địa chỉ), M7 (giỏ hàng), M8 (đặt hàng) và M9 (thanh toán).
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
  { username: 'admin',        password: 'Admin@12345',  role: 'ADMIN',     kind: 'EMPLOYEE', fullName: 'Quản Trị Viên',       phone: '0901000001', salary: 20000000, note: 'Đăng nhập web → layout Admin; thấy baseSalary trong GET /me' },
  { username: 'sales01',      password: 'Sales@12345',  role: 'SALES',     kind: 'EMPLOYEE', fullName: 'Nhân Viên Bán Hàng',  phone: '0901000002', salary: 9000000,  note: 'Web → layout Bán hàng; KHÔNG thấy lương' },
  { username: 'warehouse01',  password: 'Kho@12345',    role: 'WAREHOUSE', kind: 'EMPLOYEE', fullName: 'Nhân Viên Kho',       phone: '0901000003', salary: 9000000,  note: 'Web → layout Kho; KHÔNG thấy lương' },
  { username: 'sales_locked', password: 'Sales@12345',  role: 'SALES',     kind: 'EMPLOYEE', fullName: 'NV Bị Khóa',          phone: '0901000004', salary: 0, locked: true, note: 'Đăng nhập phải báo "Sai tên đăng nhập hoặc mật khẩu" (tài khoản bị khóa)' },
  { username: 'khach01',      password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', fullName: 'Khách Hàng Mẫu',      phone: '0900000001', note: 'Đăng nhập mobile; thử đổi hồ sơ/mật khẩu' },
  { username: 'khach02',      password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', fullName: 'Khách Hàng Thứ Hai',  phone: '0900000002', note: 'Thử sửa SĐT thành 0900000001 → 409 PHONE_TAKEN' },
  { username: 'khach_locked', password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', fullName: 'Khách Bị Khóa',       phone: '0900000003', locked: true, note: 'Đăng nhập mobile phải bị từ chối (tài khoản khóa)' },
  { username: 'khach_cu',     password: 'Khach@12345',  role: 'CUSTOMER',  kind: 'CUSTOMER', fullName: 'Khách Đã Xóa Mềm',    phone: '0900000004', deleted: true, note: 'Đã xóa mềm: không đăng nhập được; đăng ký lại username "khach_cu" + SĐT 0900000004 phải thành công' },
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

async function getRoleId(pool, name) {
  const r = await pool.request().input('n', sql.VarChar(30), name)
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

    const roleId = await getRoleId(pool, a.role);
    const hash = await bcrypt.hash(a.password, BCRYPT_COST);
    let employeeId = null;
    let customerId = null;

    if (a.kind === 'EMPLOYEE') {
      const e = await new sql.Request(tx)
        .input('n', sql.NVarChar(100), a.fullName).input('p', sql.VarChar(20), a.phone)
        .input('s', sql.Decimal(18, 2), a.salary || 0)
        .query(`INSERT INTO employees (full_name, phone, base_salary, is_deleted, deleted_at)
                VALUES (@n, @p, @s, ${a.deleted ? 1 : 0}, ${a.deleted ? 'SYSUTCDATETIME()' : 'NULL'});
                SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
      employeeId = e.recordset[0].id;
    } else {
      const c = await new sql.Request(tx)
        .input('n', sql.NVarChar(100), a.fullName).input('p', sql.VarChar(20), a.phone)
        .query(`INSERT INTO customers (full_name, phone, is_deleted, deleted_at)
                VALUES (@n, @p, ${a.deleted ? 1 : 0}, ${a.deleted ? 'SYSUTCDATETIME()' : 'NULL'});
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
  { fullName: 'Khách Tại Quầy', phone: '0900000005' }, // không có tài khoản -> badge "Tại quầy"
  ...Array.from({ length: 12 }, (_, i) => ({
    fullName: `Khách Mẫu ${String(i + 1).padStart(2, '0')}`,
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
  await pool.request().input('n', sql.NVarChar(100), c.fullName).input('p', sql.VarChar(20), c.phone)
    .query('INSERT INTO customers (full_name, phone) VALUES (@n, @p)');
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
  { sku: 'TEST-OK-40',  product: 'Giày Test – Còn hàng',   price: 1250000, size: '40', color: 'Đen',   stock: 20, active: 1 },
  { sku: 'TEST-OK-41',  product: 'Giày Test – Còn hàng',   price: 1250000, size: '41', color: 'Đen',   stock: 20, active: 1 },
  { sku: 'TEST-LOW-39', product: 'Giày Test – Sắp hết',    price: 890000,  size: '39', color: 'Trắng', stock: 3,  active: 1 },
  { sku: 'TEST-OUT-42', product: 'Giày Test – Hết hàng',   price: 990000,  size: '42', color: 'Xám',   stock: 0,  active: 1 },
  { sku: 'TEST-OFF-40', product: 'Giày Test – Ngừng bán',  price: 750000,  size: '40', color: 'Đỏ',    stock: 5,  active: 0 },
];

// Giỏ của khach01: đủ 4 trạng thái để thấy cảnh báo trên màn hình giỏ
const CART_KHACH01 = [
  { sku: 'TEST-OK-40',  qty: 2 }, // OK
  { sku: 'TEST-LOW-39', qty: 5 }, // INSUFFICIENT_STOCK (kho còn 3)
  { sku: 'TEST-OUT-42', qty: 1 }, // OUT_OF_STOCK
  { sku: 'TEST-OFF-40', qty: 1 }, // UNAVAILABLE (sản phẩm ngừng bán)
];

async function seedTestCatalog(pool) {
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
      p = await pool.request().input('n', sql.NVarChar(200), v.product).input('pr', sql.Decimal(18, 2), v.price).input('a', sql.Bit, v.active)
        .query('INSERT INTO products (product_name, current_price, is_active) VALUES (@n, @pr, @a); SELECT SCOPE_IDENTITY() AS product_id;');
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

/* ---------------- M4/M9: sản phẩm thật để test đặt hàng & thanh toán ---------------- */
/**
 * Mỗi mục: product (tên), brand (hãng), category (danh mục), basePrice (giá gốc),
 * description (mô tả ngắn), variants: [{ sku, size, color, stock, salePrice?, active? }]
 * active mặc định là 1 (đang bán). Chỉ cần 1 product entry per thương hiệu.
 */
const REAL_PRODUCTS = [
  {
    product: 'Nike Air Force 1 Low',
    brand: 'Nike',
    category: 'Sneaker',
    basePrice: 2990000,
    description: 'Giày sneaker cổ điển Nike Air Force 1 Low – đế Air êm ái, da cao cấp.',
    variants: [
      { sku: 'NK-AF1-WHT-39', size: '39', color: 'Trắng', stock: 15 },
      { sku: 'NK-AF1-WHT-40', size: '40', color: 'Trắng', stock: 20 },
      { sku: 'NK-AF1-WHT-41', size: '41', color: 'Trắng', stock: 18 },
      { sku: 'NK-AF1-WHT-42', size: '42', color: 'Trắng', stock: 10 },
      { sku: 'NK-AF1-BLK-40', size: '40', color: 'Đen',   stock: 12 },
      { sku: 'NK-AF1-BLK-41', size: '41', color: 'Đen',   stock: 8  },
      { sku: 'NK-AF1-BLK-42', size: '42', color: 'Đen',   stock: 5  },
    ],
  },
  {
    product: 'Nike Air Max 270',
    brand: 'Nike',
    category: 'Sneaker',
    basePrice: 3590000,
    description: 'Đệm Air Max 270 lớn nhất từ trước đến nay – êm, nhẹ, phong cách.',
    variants: [
      { sku: 'NK-AM270-GRY-39', size: '39', color: 'Xám',   stock: 10 },
      { sku: 'NK-AM270-GRY-40', size: '40', color: 'Xám',   stock: 14 },
      { sku: 'NK-AM270-GRY-41', size: '41', color: 'Xám',   stock: 9  },
      { sku: 'NK-AM270-BLK-40', size: '40', color: 'Đen',   stock: 7  },
      { sku: 'NK-AM270-BLK-41', size: '41', color: 'Đen',   stock: 3  }, // sắp hết
      { sku: 'NK-AM270-RED-42', size: '42', color: 'Đỏ',    stock: 0,  active: 0 }, // hết hàng + ngừng bán
    ],
  },
  {
    product: 'Adidas Superstar',
    brand: 'Adidas',
    category: 'Sneaker',
    basePrice: 2490000,
    description: 'Huyền thoại 3 sọc – Adidas Superstar với mũi giày hình vỏ sò iconic.',
    variants: [
      { sku: 'AD-SS-WHT-38', size: '38', color: 'Trắng', stock: 8  },
      { sku: 'AD-SS-WHT-39', size: '39', color: 'Trắng', stock: 16 },
      { sku: 'AD-SS-WHT-40', size: '40', color: 'Trắng', stock: 20 },
      { sku: 'AD-SS-WHT-41', size: '41', color: 'Trắng', stock: 12 },
      { sku: 'AD-SS-BLK-39', size: '39', color: 'Đen',   stock: 10 },
      { sku: 'AD-SS-BLK-40', size: '40', color: 'Đen',   stock: 6  },
    ],
  },
  {
    product: 'Adidas Ultra Boost 22',
    brand: 'Adidas',
    category: 'Chạy bộ',
    basePrice: 4290000,
    description: 'Công nghệ Boost đỉnh cao – trả lại năng lượng từng bước chạy.',
    variants: [
      { sku: 'AD-UB22-WHT-40', size: '40', color: 'Trắng', stock: 5  },
      { sku: 'AD-UB22-WHT-41', size: '41', color: 'Trắng', stock: 9  },
      { sku: 'AD-UB22-WHT-42', size: '42', color: 'Trắng', stock: 11 },
      { sku: 'AD-UB22-GRY-41', size: '41', color: 'Xám',   stock: 7  },
      { sku: 'AD-UB22-GRY-42', size: '42', color: 'Xám',   stock: 4  },
      { sku: 'AD-UB22-BLK-43', size: '43', color: 'Đen',   stock: 6  },
    ],
  },
  {
    product: 'Vans Old Skool',
    brand: 'Vans',
    category: 'Sneaker',
    basePrice: 1890000,
    description: 'Giày skate huyền thoại Vans Old Skool – sọc sườn nổi bật, đế waffle bền bỉ.',
    variants: [
      { sku: 'VN-OS-BW-38',  size: '38', color: 'Trắng', stock: 12 },
      { sku: 'VN-OS-BW-39',  size: '39', color: 'Trắng', stock: 18 },
      { sku: 'VN-OS-BW-40',  size: '40', color: 'Trắng', stock: 22 },
      { sku: 'VN-OS-BW-41',  size: '41', color: 'Trắng', stock: 15 },
      { sku: 'VN-OS-BLK-39', size: '39', color: 'Đen',   stock: 9  },
      { sku: 'VN-OS-BLK-40', size: '40', color: 'Đen',   stock: 14 },
      { sku: 'VN-OS-NVY-40', size: '40', color: 'Xanh dương', stock: 7 },
      { sku: 'VN-OS-NVY-41', size: '41', color: 'Xanh dương', stock: 5 },
    ],
  },
  {
    product: 'Converse Chuck Taylor All Star',
    brand: 'Converse',
    category: 'Sneaker',
    basePrice: 1490000,
    description: 'Sneaker canvas cổ điển Converse Chuck Taylor – không bao giờ lỗi mốt.',
    variants: [
      { sku: 'CV-CT-WHT-37', size: '37', color: 'Trắng', stock: 10 },
      { sku: 'CV-CT-WHT-38', size: '38', color: 'Trắng', stock: 15 },
      { sku: 'CV-CT-WHT-39', size: '39', color: 'Trắng', stock: 20 },
      { sku: 'CV-CT-WHT-40', size: '40', color: 'Trắng', stock: 18 },
      { sku: 'CV-CT-BLK-38', size: '38', color: 'Đen',   stock: 12 },
      { sku: 'CV-CT-BLK-39', size: '39', color: 'Đen',   stock: 14 },
      { sku: 'CV-CT-RED-39', size: '39', color: 'Đỏ',    stock: 6  },
      { sku: 'CV-CT-RED-40', size: '40', color: 'Đỏ',    stock: 4  },
    ],
  },
  {
    product: 'New Balance 574',
    brand: 'New Balance',
    category: 'Sneaker',
    basePrice: 2290000,
    description: 'Biểu tượng retro New Balance 574 – thoải mái cả ngày, phối đồ đa phong cách.',
    variants: [
      { sku: 'NB-574-GRY-39', size: '39', color: 'Xám',   stock: 8  },
      { sku: 'NB-574-GRY-40', size: '40', color: 'Xám',   stock: 13 },
      { sku: 'NB-574-GRY-41', size: '41', color: 'Xám',   stock: 10 },
      { sku: 'NB-574-NVY-40', size: '40', color: 'Xanh dương', stock: 6 },
      { sku: 'NB-574-NVY-41', size: '41', color: 'Xanh dương', stock: 9 },
      { sku: 'NB-574-GRN-40', size: '40', color: 'Xanh lá', stock: 4 },
    ],
  },
  {
    product: 'Puma RS-X',
    brand: 'Puma',
    category: 'Sneaker',
    basePrice: 2190000,
    description: 'Thiết kế chunky bold, đế RS dày dặn – Puma RS-X nổi bật trên đường phố.',
    variants: [
      { sku: 'PM-RSX-WHT-40', size: '40', color: 'Trắng', stock: 10 },
      { sku: 'PM-RSX-WHT-41', size: '41', color: 'Trắng', stock: 8  },
      { sku: 'PM-RSX-BLU-40', size: '40', color: 'Xanh dương', stock: 6 },
      { sku: 'PM-RSX-BLU-41', size: '41', color: 'Xanh dương', stock: 5 },
      { sku: 'PM-RSX-RED-42', size: '42', color: 'Đỏ',    stock: 3  },
    ],
  },
];

// Biến thể được dùng trong giỏ hàng mở rộng của khach02
const CART_KHACH02 = [
  { sku: 'NK-AF1-WHT-40', qty: 1 },
  { sku: 'AD-SS-WHT-39',  qty: 2 },
  { sku: 'VN-OS-BLK-40',  qty: 1 },
];

async function ensureBrand(pool, name) {
  const ex = await pool.request().input('n', sql.NVarChar(100), name)
    .query('SELECT brand_id FROM brands WHERE brand_name = @n AND is_deleted = 0');
  if (ex.recordset.length) return ex.recordset[0].brand_id;
  const r = await pool.request().input('n', sql.NVarChar(100), name)
    .query('INSERT INTO brands (brand_name) VALUES (@n); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;');
  return r.recordset[0].id;
}

async function ensureCategory(pool, name) {
  const ex = await pool.request().input('n', sql.NVarChar(100), name)
    .query('SELECT category_id FROM categories WHERE category_name = @n AND is_deleted = 0');
  if (ex.recordset.length) return ex.recordset[0].category_id;
  const r = await pool.request().input('n', sql.NVarChar(100), name)
    .query('INSERT INTO categories (category_name) VALUES (@n); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;');
  return r.recordset[0].id;
}

async function ensureColor(pool, name) {
  const ex = await pool.request().input('n', sql.NVarChar(30), name)
    .query('SELECT color_id FROM colors WHERE color_name = @n AND is_deleted = 0');
  if (ex.recordset.length) return ex.recordset[0].color_id;
  const hexMap = {
    'Xanh dương': '#1E88E5',
    'Xanh lá': '#43A047',
    'Xanh navy': '#1F2A44',
  };
  const hex = hexMap[name] || '#808080';
  const r = await pool.request().input('n', sql.NVarChar(30), name).input('h', sql.Char(7), hex)
    .query('INSERT INTO colors (color_name, hex_code) VALUES (@n, @h); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;');
  return r.recordset[0].id;
}

async function seedRealProducts(pool) {
  const admin = await pool.request().query(`SELECT user_id FROM users WHERE username = 'admin' AND is_deleted = 0`);
  if (!admin.recordset.length) throw new Error('Cần tài khoản admin để ghi sổ kho.');
  const adminId = admin.recordset[0].user_id;

  const allIds = {}; // sku → variant_id
  let newProducts = 0;
  let newVariants = 0;

  for (const prod of REAL_PRODUCTS) {
    // Đảm bảo brand & category tồn tại (bỏ qua nếu bảng chưa có)
    let brandId = null;
    let categoryId = null;
    try { brandId = await ensureBrand(pool, prod.brand); } catch { /* bảng brands chưa có → bỏ qua */ }
    try { categoryId = await ensureCategory(pool, prod.category); } catch { /* bảng categories chưa có → bỏ qua */ }

    // Tìm hoặc tạo product
    let productId;
    const exProd = await pool.request().input('n', sql.NVarChar(200), prod.product)
      .query('SELECT product_id FROM products WHERE product_name = @n AND is_deleted = 0');
    if (exProd.recordset.length) {
      productId = exProd.recordset[0].product_id;
    } else {
      // Thử INSERT với brand_id / category_id nếu cột tồn tại
      try {
        const ins = await pool.request()
          .input('n',  sql.NVarChar(200),  prod.product)
          .input('pr', sql.Decimal(18, 2), prod.basePrice)
          .input('b',  sql.Int,            brandId)
          .input('c',  sql.Int,            categoryId)
          .input('d',  sql.NVarChar(500),  prod.description)
          .query(`INSERT INTO products (product_name, current_price, brand_id, category_id, description, is_active)
                  VALUES (@n, @pr, @b, @c, @d, 1);
                  SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
        productId = ins.recordset[0].id;
      } catch {
        // Fallback: chỉ các cột cơ bản (nếu schema chưa có brand_id/category_id/description)
        const ins = await pool.request()
          .input('n',  sql.NVarChar(200),  prod.product)
          .input('pr', sql.Decimal(18, 2), prod.basePrice)
          .query(`INSERT INTO products (product_name, current_price, is_active) VALUES (@n, @pr, 1);
                  SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`);
        productId = ins.recordset[0].id;
      }
      newProducts++;
    }

    // Tạo từng variant
    for (const v of prod.variants) {
      const exV = await pool.request().input('s', sql.VarChar(50), v.sku)
        .query('SELECT variant_id FROM product_variants WHERE sku = @s AND is_deleted = 0');
      if (exV.recordset.length) {
        allIds[v.sku] = exV.recordset[0].variant_id;
        continue;
      }

      const size = await pool.request().input('l', sql.VarChar(10), v.size)
        .query('SELECT size_id FROM sizes WHERE size_label = @l AND is_deleted = 0');
      if (!size.recordset.length) {
        console.warn(`    [bỏ qua] Size ${v.size} chưa có trong bảng sizes → ${v.sku}`);
        continue;
      }
      const colorId = await ensureColor(pool, v.color);

      const isDel = v.active === 0 ? 1 : 0;

      const vr = await pool.request()
        .input('p',  sql.Int,           productId)
        .input('sz', sql.Int,           size.recordset[0].size_id)
        .input('c',  sql.Int,           colorId)
        .input('s',  sql.VarChar(50),   v.sku)
        .input('d',  sql.Bit,           isDel)
        .query(`INSERT INTO product_variants (product_id, size_id, color_id, sku, is_deleted)
                VALUES (@p, @sz, @c, @s, @d);
                SELECT CAST(SCOPE_IDENTITY() AS INT) AS variant_id;`);
      const variantId = Number(vr.recordset[0].variant_id);
      allIds[v.sku] = variantId;
      newVariants++;

      if (v.stock > 0) {
        await pool.request()
          .input('v', sql.Int,  variantId)
          .input('q', sql.Int,  v.stock)
          .input('u', sql.Int,  adminId)
          .query(`INSERT INTO inventory_transactions (variant_id, transaction_type, quantity_change, reason, created_by)
                  VALUES (@v, 'ADJUST_IN', @q, N'Seed sản phẩm thật', @u)`);
      }
    }
  }
  return { newProducts, newVariants, allIds };
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

async function main() {
  if (!config.user || !config.password) {
    throw new Error('Thiếu DB_USER / DB_PASSWORD. Tạo backend/.env (hoặc database/.env) trước.');
  }
  const pool = await new sql.ConnectionPool(config).connect();
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

  console.log('\nM7 – giỏ hàng (sản phẩm test tạm):');
  const ids = await seedTestCatalog(pool);
  for (const [sku, id] of Object.entries(ids)) console.log(`  [sản phẩm test] ${sku.padEnd(14)} → variantId ${id}`);
  console.log(`  [giỏ khach01] ${await seedCart(pool, 'khach01', CART_KHACH01, ids)}   (4 trạng thái: OK / SẮP HẾT / HẾT / NGỪNG BÁN)`);

  console.log('\nM4/M9 – sản phẩm thật (Nike, Adidas, Vans, Converse, NB, Puma):');
  const real = await seedRealProducts(pool);
  console.log(`  [sản phẩm thật] tạo mới ${real.newProducts} sản phẩm, ${real.newVariants} biến thể (tổng ${REAL_PRODUCTS.reduce((s, p) => s + p.variants.length, 0)} variants định nghĩa)`);
  const allIds = { ...ids, ...real.allIds };
  console.log(`  [giỏ khach02]  ${await seedCart(pool, 'khach02', CART_KHACH02, allIds)}   (Nike AF1, Adidas SS, Vans OS – test M9 thanh toán)`);

  console.log('\nM8 – khuyến mãi & đơn hàng:');
  console.log(`  [khuyến mãi test] tạo mới ${await seedPromotions(pool, ids)}/3 (giảm 10% giày test · hóa đơn ≥ 2 triệu giảm 5% · voucher TEST10, TESTFULL hết lượt)`);
  console.log(`  [đơn mẫu khach01] ${await seedOrders(pool, allIds)}`);

  console.log('\n=== Xong ===');
  console.log('Web : admin / sales01 / warehouse01');
  console.log('Mobile: khach01 (giỏ test), khach02 (giỏ sản phẩm thật)');
  console.log('Sản phẩm thật sẵn sàng test M9: Nike Air Force 1, Adidas Superstar, Vans Old Skool, Converse Chuck Taylor, New Balance 574, Puma RS-X, Adidas Ultra Boost');
  await pool.close();
}

main().catch((err) => {
  console.error('Seed lỗi:', err.message);
  process.exit(1);
});
