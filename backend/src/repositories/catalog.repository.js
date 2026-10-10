const { query } = require('../config/database');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/mapper.util');

const catalogRepository = {
  // ================= CATEGORIES =================
  async findAllCategories() {
    const sql = `
      SELECT category_id, category_name
      FROM categories
      WHERE is_deleted = 0
      ORDER BY category_name ASC
    `;
    const res = await query(sql);
    return mapRowsToCamel(res.recordset);
  },

  async findCategoryById(categoryId) {
    const sql = `
      SELECT category_id, category_name
      FROM categories
      WHERE category_id = @categoryId AND is_deleted = 0
    `;
    const res = await query(sql, { categoryId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async findCategoryByName(categoryName, excludeId = null) {
    const sql = `
      SELECT category_id, category_name
      FROM categories
      WHERE category_name = @categoryName AND is_deleted = 0
        AND (@excludeId IS NULL OR category_id <> @excludeId)
    `;
    const res = await query(sql, { categoryName, excludeId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async createCategory(categoryName) {
    const sql = `
      INSERT INTO categories (category_name)
      OUTPUT INSERTED.category_id, INSERTED.category_name
      VALUES (@categoryName)
    `;
    const res = await query(sql, { categoryName });
    return mapRowToCamel(res.recordset[0]);
  },

  async updateCategory(categoryId, categoryName) {
    const sql = `
      UPDATE categories
      SET category_name = @categoryName
      WHERE category_id = @categoryId AND is_deleted = 0
    `;
    await query(sql, { categoryId, categoryName });
    return this.findCategoryById(categoryId);
  },

  async countActiveProductsInCategory(categoryId) {
    const sql = `
      SELECT COUNT(*) AS total
      FROM products
      WHERE category_id = @categoryId AND is_deleted = 0 AND is_active = 1
    `;
    const res = await query(sql, { categoryId });
    return res.recordset[0].total;
  },

  async deleteCategory(categoryId) {
    const sql = `
      UPDATE categories
      SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
      WHERE category_id = @categoryId AND is_deleted = 0
    `;
    await query(sql, { categoryId });
    return true;
  },

  // ================= BRANDS =================
  async findAllBrands() {
    const sql = `
      SELECT brand_id, brand_name
      FROM brands
      WHERE is_deleted = 0
      ORDER BY brand_name ASC
    `;
    const res = await query(sql);
    return mapRowsToCamel(res.recordset);
  },

  async findBrandById(brandId) {
    const sql = `
      SELECT brand_id, brand_name
      FROM brands
      WHERE brand_id = @brandId AND is_deleted = 0
    `;
    const res = await query(sql, { brandId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async findBrandByName(brandName, excludeId = null) {
    const sql = `
      SELECT brand_id, brand_name
      FROM brands
      WHERE brand_name = @brandName AND is_deleted = 0
        AND (@excludeId IS NULL OR brand_id <> @excludeId)
    `;
    const res = await query(sql, { brandName, excludeId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async createBrand(brandName) {
    const sql = `
      INSERT INTO brands (brand_name)
      OUTPUT INSERTED.brand_id, INSERTED.brand_name
      VALUES (@brandName)
    `;
    const res = await query(sql, { brandName });
    return mapRowToCamel(res.recordset[0]);
  },

  async updateBrand(brandId, brandName) {
    const sql = `
      UPDATE brands
      SET brand_name = @brandName
      WHERE brand_id = @brandId AND is_deleted = 0
    `;
    await query(sql, { brandId, brandName });
    return this.findBrandById(brandId);
  },

  async deleteBrand(brandId) {
    const sql = `
      UPDATE brands
      SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
      WHERE brand_id = @brandId AND is_deleted = 0
    `;
    await query(sql, { brandId });
    return true;
  },

  // ================= SIZES =================
  async findAllSizes() {
    const sql = `
      SELECT size_id, size_label, sort_order
      FROM sizes
      WHERE is_deleted = 0
      ORDER BY sort_order ASC, size_label ASC
    `;
    const res = await query(sql);
    return mapRowsToCamel(res.recordset);
  },

  async findSizeById(sizeId) {
    const sql = `
      SELECT size_id, size_label, sort_order
      FROM sizes
      WHERE size_id = @sizeId AND is_deleted = 0
    `;
    const res = await query(sql, { sizeId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async createSize(sizeLabel, sortOrder = 0) {
    const sql = `
      INSERT INTO sizes (size_label, sort_order)
      OUTPUT INSERTED.size_id, INSERTED.size_label, INSERTED.sort_order
      VALUES (@sizeLabel, @sortOrder)
    `;
    const res = await query(sql, { sizeLabel, sortOrder });
    return mapRowToCamel(res.recordset[0]);
  },

  async updateSize(sizeId, sizeLabel, sortOrder = 0) {
    const sql = `
      UPDATE sizes
      SET size_label = @sizeLabel, sort_order = @sortOrder
      WHERE size_id = @sizeId AND is_deleted = 0
    `;
    await query(sql, { sizeId, sizeLabel, sortOrder });
    return this.findSizeById(sizeId);
  },

  async deleteSize(sizeId) {
    const sql = `
      UPDATE sizes
      SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
      WHERE size_id = @sizeId AND is_deleted = 0
    `;
    await query(sql, { sizeId });
    return true;
  },

  // ================= COLORS =================
  async findAllColors() {
    const sql = `
      SELECT color_id, color_name, hex_code
      FROM colors
      WHERE is_deleted = 0
      ORDER BY color_name ASC
    `;
    const res = await query(sql);
    return mapRowsToCamel(res.recordset);
  },

  async findColorById(colorId) {
    const sql = `
      SELECT color_id, color_name, hex_code
      FROM colors
      WHERE color_id = @colorId AND is_deleted = 0
    `;
    const res = await query(sql, { colorId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async createColor(colorName, hexCode = null) {
    const sql = `
      INSERT INTO colors (color_name, hex_code)
      OUTPUT INSERTED.color_id, INSERTED.color_name, INSERTED.hex_code
      VALUES (@colorName, @hexCode)
    `;
    const res = await query(sql, { colorName, hexCode });
    return mapRowToCamel(res.recordset[0]);
  },

  async updateColor(colorId, colorName, hexCode = null) {
    const sql = `
      UPDATE colors
      SET color_name = @colorName, hex_code = @hexCode
      WHERE color_id = @colorId AND is_deleted = 0
    `;
    await query(sql, { colorId, colorName, hexCode });
    return this.findColorById(colorId);
  },

  async deleteColor(colorId) {
    const sql = `
      UPDATE colors
      SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
      WHERE color_id = @colorId AND is_deleted = 0
    `;
    await query(sql, { colorId });
    return true;
  },
};

module.exports = catalogRepository;
