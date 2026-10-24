import { query, sql, type Executor } from '../config/database';
import { likePattern } from '../utils/pagination';
import type { ProductListItemRow, ProductDetailRow, VariantRow } from '../types/product.types';

/** Giữ re-export để các file cũ import kiểu từ repository vẫn chạy; có thể bỏ sau khi đổi import. */
export type { ProductListItemRow, ProductDetailRow, VariantRow } from '../types/product.types';

export const productRepository = {
  async list(
    p: {
      q?: string;
      categoryId?: number;
      brandId?: number;
      isActive?: boolean;
      minPrice?: number;
      maxPrice?: number;
      page: number;
      size: number;
    },
    exec?: Executor,
  ): Promise<{ rows: ProductListItemRow[]; total: number }> {
    const offset = (p.page - 1) * p.size;
    const qLike = p.q ? likePattern(p.q) : null;

    const countRes = await query<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM products p
       WHERE p.is_deleted = 0
         AND (@q IS NULL OR p.product_name COLLATE Vietnamese_CI_AI LIKE @qLike)
         AND (@catId IS NULL OR p.category_id = @catId)
         AND (@brandId IS NULL OR p.brand_id = @brandId)
         AND (@isActive IS NULL OR p.is_active = @isActive)
         AND (@minPrice IS NULL OR p.current_price >= @minPrice)
         AND (@maxPrice IS NULL OR p.current_price <= @maxPrice)`,
      {
        q: [sql.NVarChar(200), p.q ?? null],
        qLike: [sql.NVarChar(202), qLike],
        catId: [sql.Int, p.categoryId ?? null],
        brandId: [sql.Int, p.brandId ?? null],
        isActive: [sql.Bit, p.isActive !== undefined ? (p.isActive ? 1 : 0) : null],
        minPrice: [sql.Decimal(18, 2), p.minPrice ?? null],
        maxPrice: [sql.Decimal(18, 2), p.maxPrice ?? null],
      },
      exec,
    );

    const rowsRes = await query<ProductListItemRow>(
      `SELECT p.product_id AS productId, p.product_name AS productName,
              p.category_id AS categoryId, c.category_name AS categoryName,
              p.brand_id AS brandId, b.brand_name AS brandName,
              p.current_price AS currentPrice, p.unit, p.image_url AS imageUrl,
              p.is_active AS isActive,
              ISNULL(SUM(v.stock_quantity), 0) AS totalStock,
              COUNT(v.variant_id) AS variantCount
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       LEFT JOIN product_variants v ON v.product_id = p.product_id AND v.is_deleted = 0
       WHERE p.is_deleted = 0
         AND (@q IS NULL OR p.product_name COLLATE Vietnamese_CI_AI LIKE @qLike)
         AND (@catId IS NULL OR p.category_id = @catId)
         AND (@brandId IS NULL OR p.brand_id = @brandId)
         AND (@isActive IS NULL OR p.is_active = @isActive)
         AND (@minPrice IS NULL OR p.current_price >= @minPrice)
         AND (@maxPrice IS NULL OR p.current_price <= @maxPrice)
       GROUP BY p.product_id, p.product_name, p.category_id, c.category_name,
                p.brand_id, b.brand_name, p.current_price, p.unit, p.image_url, p.is_active
       ORDER BY p.product_id DESC
       OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`,
      {
        q: [sql.NVarChar(200), p.q ?? null],
        qLike: [sql.NVarChar(202), qLike],
        catId: [sql.Int, p.categoryId ?? null],
        brandId: [sql.Int, p.brandId ?? null],
        isActive: [sql.Bit, p.isActive !== undefined ? (p.isActive ? 1 : 0) : null],
        minPrice: [sql.Decimal(18, 2), p.minPrice ?? null],
        maxPrice: [sql.Decimal(18, 2), p.maxPrice ?? null],
        offset: [sql.Int, offset],
        size: [sql.Int, p.size],
      },
      exec,
    );

    return {
      rows: rowsRes.recordset.map((r) => ({
        ...r,
        currentPrice: Number(r.currentPrice),
        isActive: Boolean(r.isActive),
        totalStock: Number(r.totalStock),
        variantCount: Number(r.variantCount),
      })),
      total: countRes.recordset[0]?.total ?? 0,
    };
  },

  async findDetailById(productId: number, exec?: Executor): Promise<ProductDetailRow | null> {
    const r = await query<ProductDetailRow>(
      `SELECT p.product_id AS productId, p.product_name AS productName,
              p.category_id AS categoryId, c.category_name AS categoryName,
              p.brand_id AS brandId, b.brand_name AS brandName,
              p.current_price AS currentPrice, p.unit, p.image_url AS imageUrl,
              p.description, p.is_active AS isActive,
              ISNULL(v.totalStock, 0) AS totalStock,
              ISNULL(v.variantCount, 0) AS variantCount,
              pr.avgRating,
              ISNULL(pr.reviewCount, 0) AS reviewCount
       FROM products p
       LEFT JOIN categories c ON c.category_id = p.category_id
       LEFT JOIN brands b ON b.brand_id = p.brand_id
       OUTER APPLY (
         SELECT SUM(stock_quantity) AS totalStock, COUNT(*) AS variantCount
         FROM product_variants
         WHERE product_id = p.product_id AND is_deleted = 0
       ) v
       OUTER APPLY (
         SELECT AVG(CAST(rating AS FLOAT)) AS avgRating, COUNT(*) AS reviewCount
         FROM product_reviews
         WHERE product_id = p.product_id AND is_deleted = 0 AND status = 'APPROVED'
       ) pr
       WHERE p.product_id = @id AND p.is_deleted = 0`,
      { id: [sql.Int, productId] },
      exec,
    );
    const row = r.recordset[0];
    if (!row) return null;
    return {
      ...row,
      currentPrice: Number(row.currentPrice),
      isActive: Boolean(row.isActive),
      totalStock: Number(row.totalStock),
      variantCount: Number(row.variantCount),
      avgRating: row.avgRating !== null ? Math.round(Number(row.avgRating) * 10) / 10 : null,
      reviewCount: Number(row.reviewCount ?? 0),
    };
  },

  async findVariantsByProductId(productId: number, exec?: Executor): Promise<VariantRow[]> {
    const r = await query<VariantRow>(
      `SELECT v.variant_id AS variantId, v.product_id AS productId, v.sku,
              v.stock_quantity AS stockQuantity, v.size_id AS sizeId, s.size_label AS sizeLabel,
              v.color_id AS colorId, c.color_name AS colorName, c.hex_code AS hexCode
       FROM product_variants v
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.product_id = @id AND v.is_deleted = 0
       ORDER BY s.sort_order ASC, s.size_label ASC, c.color_name ASC`,
      { id: [sql.Int, productId] },
      exec,
    );
    return r.recordset.map((v) => ({
      ...v,
      stockQuantity: Number(v.stockQuantity),
    }));
  },

  async insert(
    d: {
      productName: string;
      categoryId?: number | null;
      brandId?: number | null;
      currentPrice: number;
      unit?: string;
      description?: string | null;
      imageUrl?: string | null;
    },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO products (product_name, category_id, brand_id, current_price, unit, description, image_url)
       VALUES (@name, @cat, @brand, @price, @unit, @desc, @img);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        name: [sql.NVarChar(200), d.productName],
        cat: [sql.Int, d.categoryId ?? null],
        brand: [sql.Int, d.brandId ?? null],
        price: [sql.Decimal(18, 2), d.currentPrice],
        unit: [sql.NVarChar(20), d.unit ?? 'Đôi'],
        desc: [sql.NVarChar(sql.MAX), d.description ?? null],
        img: [sql.VarChar(500), d.imageUrl ?? null],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async update(
    id: number,
    d: {
      productName?: string;
      categoryId?: number | null;
      brandId?: number | null;
      currentPrice?: number;
      unit?: string;
      description?: string | null;
      imageUrl?: string | null;
    },
    exec?: Executor,
  ): Promise<void> {
    await query(
      `UPDATE products SET
         product_name = COALESCE(@name, product_name),
         category_id = CASE WHEN @catProvided = 1 THEN @cat ELSE category_id END,
         brand_id = CASE WHEN @brandProvided = 1 THEN @brand ELSE brand_id END,
         current_price = COALESCE(@price, current_price),
         unit = COALESCE(@unit, unit),
         description = CASE WHEN @descProvided = 1 THEN @desc ELSE description END,
         image_url = CASE WHEN @imgProvided = 1 THEN @img ELSE image_url END
       WHERE product_id = @id AND is_deleted = 0`,
      {
        id: [sql.Int, id],
        name: [sql.NVarChar(200), d.productName ?? null],
        catProvided: [sql.Bit, d.categoryId !== undefined ? 1 : 0],
        cat: [sql.Int, d.categoryId ?? null],
        brandProvided: [sql.Bit, d.brandId !== undefined ? 1 : 0],
        brand: [sql.Int, d.brandId ?? null],
        price: [sql.Decimal(18, 2), d.currentPrice ?? null],
        unit: [sql.NVarChar(20), d.unit ?? null],
        descProvided: [sql.Bit, d.description !== undefined ? 1 : 0],
        desc: [sql.NVarChar(sql.MAX), d.description ?? null],
        imgProvided: [sql.Bit, d.imageUrl !== undefined ? 1 : 0],
        img: [sql.VarChar(500), d.imageUrl ?? null],
      },
      exec,
    );
  },

  async setActive(id: number, isActive: boolean, exec?: Executor): Promise<void> {
    await query(
      `UPDATE products SET is_active = @active WHERE product_id = @id AND is_deleted = 0`,
      { id: [sql.Int, id], active: [sql.Bit, isActive ? 1 : 0] },
      exec,
    );
  },

  async softDelete(id: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE products SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE product_id = @id`,
      { id: [sql.Int, id] },
      exec,
    );
  },

  async softDeleteVariantsByProductId(productId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE product_variants SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE product_id = @id AND is_deleted = 0`,
      { id: [sql.Int, productId] },
      exec,
    );
  },

  // Variants
  async findVariantById(variantId: number, exec?: Executor): Promise<VariantRow | null> {
    const r = await query<VariantRow>(
      `SELECT v.variant_id AS variantId, v.product_id AS productId, v.sku,
              v.stock_quantity AS stockQuantity, v.size_id AS sizeId, s.size_label AS sizeLabel,
              v.color_id AS colorId, c.color_name AS colorName, c.hex_code AS hexCode
       FROM product_variants v
       JOIN sizes s ON s.size_id = v.size_id
       JOIN colors c ON c.color_id = v.color_id
       WHERE v.variant_id = @id AND v.is_deleted = 0`,
      { id: [sql.Int, variantId] },
      exec,
    );
    const row = r.recordset[0];
    if (!row) return null;
    return { ...row, stockQuantity: Number(row.stockQuantity) };
  },

  async skuExists(sku: string, excludeVariantId?: number | null, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM product_variants
       WHERE sku = @sku AND is_deleted = 0 AND (@exclude IS NULL OR variant_id <> @exclude)`,
      { sku: [sql.VarChar(50), sku], exclude: [sql.Int, excludeVariantId ?? null] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async insertVariant(
    d: { productId: number; sizeId: number; colorId: number; sku: string },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO product_variants (product_id, size_id, color_id, sku, stock_quantity)
       VALUES (@pid, @sid, @cid, @sku, 0);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        pid: [sql.Int, d.productId],
        sid: [sql.Int, d.sizeId],
        cid: [sql.Int, d.colorId],
        sku: [sql.VarChar(50), d.sku],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async updateVariantSku(variantId: number, sku: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE product_variants SET sku = @sku WHERE variant_id = @id AND is_deleted = 0`,
      { id: [sql.Int, variantId], sku: [sql.VarChar(50), sku] },
      exec,
    );
  },

  async softDeleteVariant(variantId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE product_variants SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
       WHERE variant_id = @id AND is_deleted = 0`,
      { id: [sql.Int, variantId] },
      exec,
    );
  },
};
