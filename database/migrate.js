/**
 * database/migrate.js – chạy lần lượt MỌI file *.sql trong database/migrations (theo tên: 001, 002, …).
 *
 *   cd database && npm run migrate
 *
 * Đọc cấu hình từ backend/.env (hoặc database/.env), giống seed.js.
 * Không tạo bảng theo dõi riêng (tránh đổi schema), nên mỗi file migration PHẢI chạy lại được nhiều lần
 * (dùng IF NOT EXISTS / IF EXISTS như 001_roles_sales_warehouse.sql).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const sql = require('mssql');

const DIR = path.join(__dirname, 'migrations');

/** Tách file T-SQL thành các batch theo dòng GO; bỏ dòng USE để dùng đúng DB_NAME trong .env. */
function splitBatches(text) {
  return text
    .split(/^\s*GO\s*(?:--.*)?$/gim)
    .map((b) => b.replace(/^\s*USE\s+\[?\w+\]?\s*;?\s*$/gim, '').trim())
    .filter((b) => b.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '').trim()); // bỏ batch chỉ có chú thích
}

async function main() {
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('Thiếu DB_USER / DB_PASSWORD. Tạo backend/.env (hoặc database/.env) trước.');
  }
  const files = fs.readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.sql')).sort();
  if (!files.length) return console.log('Không có file migration nào.');

  const pool = await new sql.ConnectionPool({
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'ShoeStore',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
    },
  }).connect();

  for (const file of files) {
    console.log(`▶ ${file}`);
    for (const batch of splitBatches(fs.readFileSync(path.join(DIR, file), 'utf8'))) {
      const r = await pool.request().batch(batch);
      for (const rs of r.recordsets) if (rs.length) console.table(rs);
    }
    console.log(`✔ ${file}\n`);
  }
  await pool.close();
  console.log(`Xong ${files.length} migration.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Migration lỗi:', err.message);
    process.exit(1);
  });
}

module.exports = { splitBatches };
