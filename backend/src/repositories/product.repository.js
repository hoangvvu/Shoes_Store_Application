const { query, transaction, sql } = require('../config/database');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/mapper.util');

const productRepository = {
  /**
   * Search and filter products with pagination
   */
  async findAll({
    q = null,
    categoryId = null,
    brandId = null,
    minPrice = null,
    maxPrice = null,
    sizeId = null,
    colorId = null,
    isActive = null,
    page = 1,
    size = 12,
    sortBy = 'product_id',
    sortOrder = 'DESC',
  }) {
    const offset = (page - 1) * size;

    let filterSql = 'WHERE p.is_deleted = 0';
    if (isActive !== null && isActive !== undefined) {
      filterSql += ' AND p.is_active = @isActive';
    }
    if (categoryId) {
      filterSql += ' AND p.category_id = @categoryId';
    }
    if (brandId) {
      filterSql += ' AND p.brand_id = @brandId';
    }
    if (minPrice !== null && minPrice !== undefined) {
      filterSql += ' AND p.current_price >= @minPrice';
    }
    if (maxPrice !== null && maxPrice !== undefined) {
      filterSql += ' AND p.current_price <= @maxPrice';
    }
    if (q) {
      filterSql += ` AND p.product_name COLLATE Vietnamese_CI_AI LIKE N'%' + @q + N'%'`;
    }
    if (sizeId || colorId) {
      filterSql += ` AND EXISTS (
        SELECT 1 FROM product_variants pv 
        WHERE pv.product_id = p.product_id AND pv.is_deleted = 0
          ${sizeId ? 'AND pv.size_id = @sizeId' : ''}
          ${colorId ? 'AND pv.color_id = @colorId' : ''}
      )`;
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM products p
      ${filterSql}
    `;

    // Map allowed sort fields to prevent SQL injection
    const allowedSort = {
      product_id: 'p.product_id',
      current_price: 'p.current_price',
      product_name: 'p.product_name',
    };
    const sortField = allowedSort[sortBy] || 'p.product_id';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const selectSql = `
      SELECT p.product_id, p.product_name, p.category_id, c.category_name,
             p.brand_id, b.brand_name, p.current_price, p.unit, p.description,
             p.image_url, p.is_active,
             ISNULL(SUM(v.stock_quantity), 0) AS total_stock,
             COUNT(DISTINCT v.variant_id) AS variant_count
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN brands b ON b.brand_id = p.brand_id
      LEFT JOIN product_variants v ON v.product_id = p.product_id AND v.is_deleted = 0
      ${filterSql}
      GROUP BY p.product_id, p.product_name, p.category_id, c.category_name,
               p.brand_id, b.brand_name, p.current_price, p.unit, p.description,
               p.image_url, p.is_active
      ORDER BY ${sortField} ${direction}
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const params = {
      q: q || null,
      categoryId: categoryId || null,
      brandId: brandId || null,
      minPrice: minPrice !== null && minPrice !== undefined ? minPrice : null,
      maxPrice: maxPrice !== null && maxPrice !== undefined ? maxPrice : null,
      sizeId: sizeId || null,
      colorId: colorId || null,
      isActive: isActive !== null && isActive !== undefined ? (isActive ? 1 : 0) : null,
      offset,
      size,
    };

    const countRes = await query(countSql, params);
    const selectRes = await query(selectSql, params);

    const total = countRes.recordset[0].total;
    return {
      items: mapRowsToCamel(selectRes.recordset),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  /**
   * Find product details along with its variants and promo/review summary
   */
  async findById(productId) {
    const prodSql = `
      SELECT p.product_id, p.product_name, p.category_id, c.category_name,
             p.brand_id, b.brand_name, p.current_price, p.unit, p.description,
             p.image_url, p.is_active, p.is_deleted,
             ISNULL(rv.avg_rating, 0) AS avg_rating,
             ISNULL(rv.review_count, 0) AS review_count,
             ISNULL(pm.discount_percent, 0) AS active_discount_percent
      FROM products p
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN brands b ON b.brand_id = p.brand_id
      OUTER APPLY (
        SELECT CAST(AVG(CAST(rating AS DECIMAL(3,2))) AS DECIMAL(3,1)) AS avg_rating,
               COUNT(*) AS review_count
        FROM product_reviews
        WHERE product_id = p.product_id AND status = 'APPROVED' AND is_deleted = 0
      ) rv
      OUTER APPLY (
        SELECT TOP 1 pp.discount_percent
        FROM promotion_products pp
        JOIN promotions pr ON pr.promotion_id = pp.promotion_id
        WHERE pp.product_id = p.product_id AND pr.is_deleted = 0 AND pr.is_active = 1
          AND pr.promo_type = 'PRODUCT'
          AND CAST(SYSUTCDATETIME() AS DATE) BETWEEN pr.start_date AND pr.end_date
        ORDER BY pp.discount_percent DESC
      ) pm
      WHERE p.product_id = @productId AND p.is_deleted = 0
    `;
    const prodRes = await query(prodSql, { productId });
    if (!prodRes.recordset[0]) return null;

    const product = mapRowToCamel(prodRes.recordset[0]);

    // Calculate effective promotional price
    if (product.activeDiscountPercent > 0) {
      product.finalPrice = Math.round(
        product.currentPrice * (1 - product.activeDiscountPercent / 100)
      );
    } else {
      product.finalPrice = product.currentPrice;
    }

    // Load variants
    const varSql = `
      SELECT v.variant_id, v.product_id, v.sku, v.stock_quantity,
             v.size_id, s.size_label, s.sort_order,
             v.color_id, cl.color_name, cl.hex_code
      FROM product_variants v
      JOIN sizes s ON s.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      WHERE v.product_id = @productId AND v.is_deleted = 0
      ORDER BY s.sort_order ASC, cl.color_name ASC
    `;
    const varRes = await query(varSql, { productId });
    product.variants = mapRowsToCamel(varRes.recordset);

    return product;
  },

  async create({ productName, categoryId, brandId, currentPrice, unit, description, imageUrl, isActive = true }, actorUserId = null) {
    return transaction(async (req) => {
      req.input('productName', sql.NVarChar(200), productName);
      req.input('categoryId', sql.Int, categoryId || null);
      req.input('brandId', sql.Int, brandId || null);
      req.input('currentPrice', sql.Decimal(18, 2), currentPrice);
      req.input('unit', sql.NVarChar(20), unit || 'Đôi');
      req.input('description', sql.NVarChar(sql.MAX), description || null);
      req.input('imageUrl', sql.VarChar(500), imageUrl || null);
      req.input('isActive', sql.Bit, isActive ? 1 : 0);

      const res = await req.query(`
        INSERT INTO products (product_name, category_id, brand_id, current_price, unit, description, image_url, is_active)
        OUTPUT INSERTED.product_id
        VALUES (@productName, @categoryId, @brandId, @currentPrice, @unit, @description, @imageUrl, @isActive);
      `);
      return res.recordset[0].product_id;
    }, actorUserId);
  },

  async update(productId, { productName, categoryId, brandId, currentPrice, unit, description, imageUrl, isActive }, actorUserId = null) {
    return transaction(async (req) => {
      req.input('productId', sql.Int, productId);
      req.input('productName', sql.NVarChar(200), productName !== undefined ? productName : null);
      req.input('productNameProvided', sql.Bit, productName !== undefined ? 1 : 0);
      req.input('categoryId', sql.Int, categoryId !== undefined ? categoryId : null);
      req.input('categoryIdProvided', sql.Bit, categoryId !== undefined ? 1 : 0);
      req.input('brandId', sql.Int, brandId !== undefined ? brandId : null);
      req.input('brandIdProvided', sql.Bit, brandId !== undefined ? 1 : 0);
      req.input('currentPrice', sql.Decimal(18, 2), currentPrice !== undefined ? currentPrice : null);
      req.input('currentPriceProvided', sql.Bit, currentPrice !== undefined ? 1 : 0);
      req.input('unit', sql.NVarChar(20), unit !== undefined ? unit : null);
      req.input('unitProvided', sql.Bit, unit !== undefined ? 1 : 0);
      req.input('description', sql.NVarChar(sql.MAX), description !== undefined ? description : null);
      req.input('descriptionProvided', sql.Bit, description !== undefined ? 1 : 0);
      req.input('imageUrl', sql.VarChar(500), imageUrl !== undefined ? imageUrl : null);
      req.input('imageUrlProvided', sql.Bit, imageUrl !== undefined ? 1 : 0);
      req.input('isActive', sql.Bit, isActive !== undefined ? (isActive ? 1 : 0) : null);
      req.input('isActiveProvided', sql.Bit, isActive !== undefined ? 1 : 0);

      await req.query(`
        UPDATE products
        SET product_name  = CASE WHEN @productNameProvided = 1 THEN @productName ELSE product_name END,
            category_id   = CASE WHEN @categoryIdProvided = 1 THEN @categoryId ELSE category_id END,
            brand_id      = CASE WHEN @brandIdProvided = 1 THEN @brandId ELSE brand_id END,
            current_price = CASE WHEN @currentPriceProvided = 1 THEN @currentPrice ELSE current_price END,
            unit          = CASE WHEN @unitProvided = 1 THEN @unit ELSE unit END,
            description   = CASE WHEN @descriptionProvided = 1 THEN @description ELSE description END,
            image_url     = CASE WHEN @imageUrlProvided = 1 THEN @imageUrl ELSE image_url END,
            is_active     = CASE WHEN @isActiveProvided = 1 THEN @isActive ELSE is_active END
        WHERE product_id = @productId AND is_deleted = 0;
      `);

      return true;
    }, actorUserId);
  },

  async setActive(productId, isActive, actorUserId = null) {
    const sqlText = `
      UPDATE products
      SET is_active = @isActive
      WHERE product_id = @productId AND is_deleted = 0;
    `;
    await query(sqlText, { productId, isActive: isActive ? 1 : 0 });
    return true;
  },

  async softDelete(productId, actorUserId = null) {
    return transaction(async (req) => {
      req.input('productId', sql.Int, productId);

      // Soft delete product and its variants in 1 transaction
      await req.query(`
        UPDATE products
        SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
        WHERE product_id = @productId AND is_deleted = 0;

        UPDATE product_variants
        SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
        WHERE product_id = @productId AND is_deleted = 0;
      `);

      return true;
    }, actorUserId);
  },

  // ================= VARIANTS =================
  async findVariantById(variantId) {
    const sqlText = `
      SELECT v.variant_id, v.product_id, v.sku, v.stock_quantity, v.is_deleted,
             v.size_id, s.size_label, v.color_id, cl.color_name, cl.hex_code,
             p.product_name, p.current_price, p.is_active
      FROM product_variants v
      JOIN products p ON p.product_id = v.product_id
      JOIN sizes s ON s.size_id = v.size_id
      JOIN colors cl ON cl.color_id = v.color_id
      WHERE v.variant_id = @variantId AND v.is_deleted = 0
    `;
    const res = await query(sqlText, { variantId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async findVariantBySku(sku, excludeId = null) {
    const sqlText = `
      SELECT variant_id, sku, product_id
      FROM product_variants
      WHERE sku = @sku AND is_deleted = 0
        AND (@excludeId IS NULL OR variant_id <> @excludeId)
    `;
    const res = await query(sqlText, { sku, excludeId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  async bulkCreateVariants(productId, combos, actorUserId = null) {
    return transaction(async (req) => {
      const createdVariants = [];

      for (let i = 0; i < combos.length; i++) {
        const item = combos[i];
        req.input(`pid_${i}`, sql.Int, productId);
        req.input(`sid_${i}`, sql.Int, item.sizeId);
        req.input(`cid_${i}`, sql.Int, item.colorId);
        req.input(`sku_${i}`, sql.VarChar(50), item.sku);

        const checkRes = await req.query(`
          SELECT variant_id FROM product_variants
          WHERE product_id = @pid_${i} AND size_id = @sid_${i} AND color_id = @cid_${i} AND is_deleted = 0;
        `);

        if (checkRes.recordset.length === 0) {
          const insertRes = await req.query(`
            INSERT INTO product_variants (product_id, size_id, color_id, sku, stock_quantity)
            OUTPUT INSERTED.variant_id, INSERTED.sku
            VALUES (@pid_${i}, @sid_${i}, @cid_${i}, @sku_${i}, 0);
          `);
          createdVariants.push(mapRowToCamel(insertRes.recordset[0]));
        }
      }

      return createdVariants;
    }, actorUserId);
  },

  async updateVariant(variantId, { sku }, actorUserId = null) {
    const sqlText = `
      UPDATE product_variants
      SET sku = @sku
      WHERE variant_id = @variantId AND is_deleted = 0;
    `;
    await query(sqlText, { variantId, sku });
    return this.findVariantById(variantId);
  },

  async deleteVariant(variantId, actorUserId = null) {
    const sqlText = `
      UPDATE product_variants
      SET is_deleted = 1, deleted_at = SYSUTCDATETIME()
      WHERE variant_id = @variantId AND is_deleted = 0;
    `;
    await query(sqlText, { variantId });
    return true;
  },
};

module.exports = productRepository;
