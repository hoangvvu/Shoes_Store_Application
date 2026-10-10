const { query } = require('../config/database');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/mapper.util');

const supplierRepository = {
  async findAll({ q = null, page = 1, size = 10 }) {
    const offset = (page - 1) * size;
    let filterSql = 'WHERE is_deleted = 0';
    if (q) {
      filterSql += ` AND (supplier_name COLLATE Vietnamese_CI_AI LIKE N'%' + @q + N'%' OR phone LIKE '%' + @q + '%' OR email LIKE '%' + @q + '%')`;
    }

    const countSql = `SELECT COUNT(*) AS total FROM suppliers ${filterSql}`;
    const selectSql = `
      SELECT supplier_id, supplier_name, phone, email, address, is_deleted
      FROM suppliers
      ${filterSql}
      ORDER BY supplier_id DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const countRes = await query(countSql, { q: q || null });
    const selectRes = await query(selectSql, { q: q || null, offset, size });

    const total = countRes.recordset[0].total;
    return {
      items: mapRowsToCamel(selectRes.recordset),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  async findById(supplierId) {
    const sql = `
      SELECT supplier_id, supplier_name, phone, email, address, is_deleted
      FROM suppliers
      WHERE supplier_id = @supplierId AND is_deleted = 0
    `;
    const res = await query(sql, { supplierId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async create({ supplierName, phone, email, address }) {
    const sql = `
      INSERT INTO suppliers (supplier_name, phone, email, address)
      OUTPUT INSERTED.supplier_id, INSERTED.supplier_name, INSERTED.phone, INSERTED.email, INSERTED.address
      VALUES (@supplierName, @phone, @email, @address)
    `;
    const res = await query(sql, {
      supplierName,
      phone: phone || null,
      email: email || null,
      address: address || null,
    });
    return mapRowToCamel(res.recordset[0]);
  },

  async update(supplierId, { supplierName, phone, email, address }) {
    const sql = `
      UPDATE suppliers
      SET supplier_name = ISNULL(@supplierName, supplier_name),
          phone         = CASE WHEN @phoneProvided = 1 THEN @phone ELSE phone END,
          email         = CASE WHEN @emailProvided = 1 THEN @email ELSE email END,
          address       = CASE WHEN @addressProvided = 1 THEN @address ELSE address END
      WHERE supplier_id = @supplierId AND is_deleted = 0
    `;
    await query(sql, {
      supplierId,
      supplierName: supplierName || null,
      phoneProvided: phone !== undefined ? 1 : 0,
      phone: phone || null,
      emailProvided: email !== undefined ? 1 : 0,
      email: email || null,
      addressProvided: address !== undefined ? 1 : 0,
      address: address || null,
    });
    return this.findById(supplierId);
  },

  async delete(supplierId) {
    const sql = `
      UPDATE suppliers
      SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
      WHERE supplier_id = @supplierId AND is_deleted = 0
    `;
    await query(sql, { supplierId });
    return true;
  },
};

module.exports = supplierRepository;
