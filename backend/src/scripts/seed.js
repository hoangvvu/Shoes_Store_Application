const { getPool, query } = require('../config/database');
const { hashPassword } = require('../utils/hash.util');

async function seed() {
  console.log('🌱 Bắt đầu tạo dữ liệu khởi tạo (Seed data)...');
  await getPool();

  // 1. Create Default Admin if not exists
  const existingAdmin = await query("SELECT user_id FROM users WHERE username = 'admin'");
  if (existingAdmin.recordset.length === 0) {
    const passwordHash = await hashPassword('Admin@123');

    // Insert employee first (due to ck_user_reference constraint)
    const empResult = await query(`
      INSERT INTO employees (full_name, phone, base_salary)
      OUTPUT INSERTED.employee_id
      VALUES (N'Quản Trị Viên Hệ Thống', '0988888888', 25000000)
    `);
    const employeeId = empResult.recordset[0].employee_id;

    // Insert user referencing employee_id
    await query(`
      INSERT INTO users (username, password_hash, role_id, user_type, employee_id, is_locked)
      VALUES ('admin', @passwordHash, 1, 'EMPLOYEE', @employeeId, 0)
    `, { passwordHash, employeeId });

    console.log('✅ Đã tạo tài khoản Admin mặc định: username=admin / password=Admin@123');
  } else {
    console.log('ℹ️ Tài khoản Admin đã tồn tại.');
  }

  // 2. Categories
  const existingCats = await query('SELECT COUNT(*) as count FROM categories');
  if (existingCats.recordset[0].count === 0) {
    await query(`
      INSERT INTO categories (category_name) VALUES
      (N'Giày Sneaker'),
      (N'Giày Chạy Bộ'),
      (N'Giày Thể Thao'),
      (N'Giày Lười / Casual')
    `);
    console.log('✅ Đã khởi tạo 4 danh mục mẫu.');
  }

  // 3. Brands
  const existingBrands = await query('SELECT COUNT(*) as count FROM brands');
  if (existingBrands.recordset[0].count === 0) {
    await query(`
      INSERT INTO brands (brand_name) VALUES
      (N'Nike'),
      (N'Adidas'),
      (N'Puma'),
      (N'Converse')
    `);
    console.log('✅ Đã khởi tạo 4 thương hiệu mẫu.');
  }

  // 4. Sizes
  const existingSizes = await query('SELECT COUNT(*) as count FROM sizes');
  if (existingSizes.recordset[0].count === 0) {
    await query(`
      INSERT INTO sizes (size_label, sort_order) VALUES
      ('38', 1), ('39', 2), ('40', 3), ('41', 4), ('42', 5), ('43', 6)
    `);
    console.log('✅ Đã khởi tạo 6 kích thước mẫu.');
  }

  // 5. Colors
  const existingColors = await query('SELECT COUNT(*) as count FROM colors');
  if (existingColors.recordset[0].count === 0) {
    await query(`
      INSERT INTO colors (color_name, hex_code) VALUES
      (N'Đen', '#000000'),
      (N'Trắng', '#FFFFFF'),
      (N'Đỏ', '#E53E3E'),
      (N'Xanh Navy', '#1A365D')
    `);
    console.log('✅ Đã khởi tạo 4 màu sắc mẫu.');
  }

  // 6. Supplier
  const existingSuppliers = await query('SELECT COUNT(*) as count FROM suppliers');
  if (existingSuppliers.recordset[0].count === 0) {
    await query(`
      INSERT INTO suppliers (supplier_name, phone, email, address) VALUES
      (N'Tổng Kho Giày Thể Thao Việt Nam', '0912345678', 'ncc@shoesvn.com', N'Số 123 Cầu Giấy, Hà Nội')
    `);
    console.log('✅ Đã khởi tạo nhà cung cấp mẫu.');
  }

  console.log('🎉 Hoàn tất Seed Data thành công!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Lỗi seed data:', err);
  process.exit(1);
});
