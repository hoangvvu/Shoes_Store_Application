/**
 * database/seed.js – dữ liệu mẫu để TEST M1 (xác thực & tài khoản) và M2 (khách hàng & địa chỉ).
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

  console.log('\nXong. Web: admin / sales01 / warehouse01 · Mobile: khach01.');
  await pool.close();
}

main().catch((err) => {
  console.error('Seed lỗi:', err.message);
  process.exit(1);
});
