import { query, sql, type Executor } from '../config/database';
import type { CategoryRow, BrandRow, SizeRow, ColorRow } from '../types/catalog.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { CategoryRow, BrandRow, SizeRow, ColorRow } from '../types/catalog.types';

export const catalogRepository = {
  // Categories
  async listCategories(exec?: Executor): Promise<CategoryRow[]> {
    const r = await query<CategoryRow>(
      `SELECT category_id AS categoryId, category_name AS categoryName
       FROM categories WHERE is_deleted = 0 ORDER BY category_name ASC`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findCategoryById(id: number, exec?: Executor): Promise<CategoryRow | null> {
    const r = await query<CategoryRow>(
      `SELECT category_id AS categoryId, category_name AS categoryName
       FROM categories WHERE category_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async categoryNameExists(name: string, excludeId?: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM categories
       WHERE category_name = @name AND is_deleted = 0 AND (@exclude IS NULL OR category_id <> @exclude)`,
      { name: [sql.NVarChar(100), name], exclude: [sql.Int, excludeId ?? null] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async hasProductsInCategory(categoryId: number, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM products WHERE category_id = @id AND is_deleted = 0`,
      { id: [sql.Int, categoryId] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async insertCategory(name: string, exec?: Executor): Promise<CategoryRow> {
    const r = await query<CategoryRow>(
      `INSERT INTO categories (category_name) VALUES (@name);
       SELECT category_id AS categoryId, category_name AS categoryName
       FROM categories WHERE category_id = SCOPE_IDENTITY();`,
      { name: [sql.NVarChar(100), name] },
      exec,
    );
    return r.recordset[0];
  },

  async updateCategory(id: number, name: string, exec?: Executor): Promise<CategoryRow> {
    const r = await query<CategoryRow>(
      `UPDATE categories SET category_name = @name WHERE category_id = @id AND is_deleted = 0;
       SELECT category_id AS categoryId, category_name AS categoryName
       FROM categories WHERE category_id = @id;`,
      { id: [sql.Int, id], name: [sql.NVarChar(100), name] },
      exec,
    );
    return r.recordset[0];
  },

  async softDeleteCategory(id: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE categories SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE category_id = @id`,
      { id: [sql.Int, id] },
      exec,
    );
  },

  // Brands
  async listBrands(exec?: Executor): Promise<BrandRow[]> {
    const r = await query<BrandRow>(
      `SELECT brand_id AS brandId, brand_name AS brandName
       FROM brands WHERE is_deleted = 0 ORDER BY brand_name ASC`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findBrandById(id: number, exec?: Executor): Promise<BrandRow | null> {
    const r = await query<BrandRow>(
      `SELECT brand_id AS brandId, brand_name AS brandName
       FROM brands WHERE brand_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async brandNameExists(name: string, excludeId?: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM brands
       WHERE brand_name = @name AND is_deleted = 0 AND (@exclude IS NULL OR brand_id <> @exclude)`,
      { name: [sql.NVarChar(100), name], exclude: [sql.Int, excludeId ?? null] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async insertBrand(name: string, exec?: Executor): Promise<BrandRow> {
    const r = await query<BrandRow>(
      `INSERT INTO brands (brand_name) VALUES (@name);
       SELECT brand_id AS brandId, brand_name AS brandName
       FROM brands WHERE brand_id = SCOPE_IDENTITY();`,
      { name: [sql.NVarChar(100), name] },
      exec,
    );
    return r.recordset[0];
  },

  async updateBrand(id: number, name: string, exec?: Executor): Promise<BrandRow> {
    const r = await query<BrandRow>(
      `UPDATE brands SET brand_name = @name WHERE brand_id = @id AND is_deleted = 0;
       SELECT brand_id AS brandId, brand_name AS brandName
       FROM brands WHERE brand_id = @id;`,
      { id: [sql.Int, id], name: [sql.NVarChar(100), name] },
      exec,
    );
    return r.recordset[0];
  },

  async softDeleteBrand(id: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE brands SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE brand_id = @id`,
      { id: [sql.Int, id] },
      exec,
    );
  },

  // Sizes
  async listSizes(exec?: Executor): Promise<SizeRow[]> {
    const r = await query<SizeRow>(
      `SELECT size_id AS sizeId, size_label AS sizeLabel, sort_order AS sortOrder
       FROM sizes WHERE is_deleted = 0 ORDER BY sort_order ASC, size_label ASC`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findSizeById(id: number, exec?: Executor): Promise<SizeRow | null> {
    const r = await query<SizeRow>(
      `SELECT size_id AS sizeId, size_label AS sizeLabel, sort_order AS sortOrder
       FROM sizes WHERE size_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async sizeLabelExists(label: string, excludeId?: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM sizes
       WHERE size_label = @label AND is_deleted = 0 AND (@exclude IS NULL OR size_id <> @exclude)`,
      { label: [sql.VarChar(10), label], exclude: [sql.Int, excludeId ?? null] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async insertSize(label: string, sortOrder: number, exec?: Executor): Promise<SizeRow> {
    const r = await query<SizeRow>(
      `INSERT INTO sizes (size_label, sort_order) VALUES (@label, @sortOrder);
       SELECT size_id AS sizeId, size_label AS sizeLabel, sort_order AS sortOrder
       FROM sizes WHERE size_id = SCOPE_IDENTITY();`,
      { label: [sql.VarChar(10), label], sortOrder: [sql.Int, sortOrder] },
      exec,
    );
    return r.recordset[0];
  },

  async updateSize(id: number, label?: string, sortOrder?: number, exec?: Executor): Promise<SizeRow> {
    const r = await query<SizeRow>(
      `UPDATE sizes SET
         size_label = COALESCE(@label, size_label),
         sort_order = COALESCE(@sortOrder, sort_order)
       WHERE size_id = @id AND is_deleted = 0;
       SELECT size_id AS sizeId, size_label AS sizeLabel, sort_order AS sortOrder
       FROM sizes WHERE size_id = @id;`,
      { id: [sql.Int, id], label: [sql.VarChar(10), label ?? null], sortOrder: [sql.Int, sortOrder ?? null] },
      exec,
    );
    return r.recordset[0];
  },

  async softDeleteSize(id: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE sizes SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE size_id = @id`,
      { id: [sql.Int, id] },
      exec,
    );
  },

  // Colors
  async listColors(exec?: Executor): Promise<ColorRow[]> {
    const r = await query<ColorRow>(
      `SELECT color_id AS colorId, color_name AS colorName, hex_code AS hexCode
       FROM colors WHERE is_deleted = 0 ORDER BY color_name ASC`,
      {},
      exec,
    );
    return r.recordset;
  },

  async findColorById(id: number, exec?: Executor): Promise<ColorRow | null> {
    const r = await query<ColorRow>(
      `SELECT color_id AS colorId, color_name AS colorName, hex_code AS hexCode
       FROM colors WHERE color_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async colorNameExists(name: string, excludeId?: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM colors
       WHERE color_name = @name AND is_deleted = 0 AND (@exclude IS NULL OR color_id <> @exclude)`,
      { name: [sql.NVarChar(30), name], exclude: [sql.Int, excludeId ?? null] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async insertColor(name: string, hexCode?: string | null, exec?: Executor): Promise<ColorRow> {
    const r = await query<ColorRow>(
      `INSERT INTO colors (color_name, hex_code) VALUES (@name, @hexCode);
       SELECT color_id AS colorId, color_name AS colorName, hex_code AS hexCode
       FROM colors WHERE color_id = SCOPE_IDENTITY();`,
      { name: [sql.NVarChar(30), name], hexCode: [sql.VarChar(7), hexCode ?? null] },
      exec,
    );
    return r.recordset[0];
  },

  async updateColor(id: number, name?: string, hexCode?: string | null, exec?: Executor): Promise<ColorRow> {
    const r = await query<ColorRow>(
      `UPDATE colors SET
         color_name = COALESCE(@name, color_name),
         hex_code = COALESCE(@hexCode, hex_code)
       WHERE color_id = @id AND is_deleted = 0;
       SELECT color_id AS colorId, color_name AS colorName, hex_code AS hexCode
       FROM colors WHERE color_id = @id;`,
      { id: [sql.Int, id], name: [sql.NVarChar(30), name ?? null], hexCode: [sql.VarChar(7), hexCode ?? null] },
      exec,
    );
    return r.recordset[0];
  },

  async softDeleteColor(id: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE colors SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE color_id = @id`,
      { id: [sql.Int, id] },
      exec,
    );
  },
};
