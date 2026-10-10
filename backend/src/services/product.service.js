const productRepository = require('../repositories/product.repository');
const catalogRepository = require('../repositories/catalog.repository');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateBulkVariants,
  validateUpdateVariant,
} = require('../validators/product.validator');
const { NotFoundError, BadRequestError, ConflictError } = require('../errors');

const productService = {
  async getProducts(params) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const size = Math.max(1, Math.min(100, parseInt(params.size, 10) || 12));
    const minPrice = params.minPrice !== undefined ? Number(params.minPrice) : null;
    const maxPrice = params.maxPrice !== undefined ? Number(params.maxPrice) : null;
    const categoryId = params.categoryId ? parseInt(params.categoryId, 10) : null;
    const brandId = params.brandId ? parseInt(params.brandId, 10) : null;
    const sizeId = params.sizeId ? parseInt(params.sizeId, 10) : null;
    const colorId = params.colorId ? parseInt(params.colorId, 10) : null;

    let isActive = null;
    if (params.isActive !== undefined) {
      isActive = params.isActive === 'true' || params.isActive === true;
    }

    return productRepository.findAll({
      q: params.q ? params.q.trim() : null,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      sizeId,
      colorId,
      isActive,
      page,
      size,
      sortBy: params.sortBy || 'product_id',
      sortOrder: params.sortOrder || 'DESC',
    });
  },

  async getProductById(productId) {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError(`Không tìm thấy sản phẩm #${productId}`);
    }
    return product;
  },

  async createProduct(data, actorUserId = null) {
    validateCreateProduct(data);

    // Validate category & brand if provided
    if (data.categoryId) {
      const cat = await catalogRepository.findCategoryById(data.categoryId);
      if (!cat) throw new BadRequestError(`Danh mục #${data.categoryId} không tồn tại`);
    }
    if (data.brandId) {
      const brand = await catalogRepository.findBrandById(data.brandId);
      if (!brand) throw new BadRequestError(`Thương hiệu #${data.brandId} không tồn tại`);
    }

    const productId = await productRepository.create(
      {
        productName: data.productName.trim(),
        categoryId: data.categoryId || null,
        brandId: data.brandId || null,
        currentPrice: Number(data.currentPrice),
        unit: data.unit ? data.unit.trim() : 'Đôi',
        description: data.description ? data.description.trim() : null,
        imageUrl: data.imageUrl || null,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
      actorUserId
    );

    return productRepository.findById(productId);
  },

  async updateProduct(productId, data, actorUserId = null) {
    validateUpdateProduct(data);

    const existing = await productRepository.findById(productId);
    if (!existing) {
      throw new NotFoundError(`Không tìm thấy sản phẩm #${productId}`);
    }

    if (data.categoryId) {
      const cat = await catalogRepository.findCategoryById(data.categoryId);
      if (!cat) throw new BadRequestError(`Danh mục #${data.categoryId} không tồn tại`);
    }
    if (data.brandId) {
      const brand = await catalogRepository.findBrandById(data.brandId);
      if (!brand) throw new BadRequestError(`Thương hiệu #${data.brandId} không tồn tại`);
    }

    await productRepository.update(
      productId,
      {
        productName: data.productName ? data.productName.trim() : undefined,
        categoryId: data.categoryId,
        brandId: data.brandId,
        currentPrice: data.currentPrice !== undefined ? Number(data.currentPrice) : undefined,
        unit: data.unit ? data.unit.trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        imageUrl: data.imageUrl !== undefined ? data.imageUrl : undefined,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : undefined,
      },
      actorUserId
    );

    return productRepository.findById(productId);
  },

  async toggleActive(productId, isActive, actorUserId = null) {
    const existing = await productRepository.findById(productId);
    if (!existing) {
      throw new NotFoundError(`Không tìm thấy sản phẩm #${productId}`);
    }

    await productRepository.setActive(productId, Boolean(isActive), actorUserId);
    return productRepository.findById(productId);
  },

  async deleteProduct(productId, actorUserId = null) {
    const existing = await productRepository.findById(productId);
    if (!existing) {
      throw new NotFoundError(`Không tìm thấy sản phẩm #${productId}`);
    }

    return productRepository.softDelete(productId, actorUserId);
  },

  // ================= VARIANTS =================
  async bulkCreateVariants(productId, { sizeIds, colorIds }, actorUserId = null) {
    validateBulkVariants({ sizeIds, colorIds });

    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError(`Không tìm thấy sản phẩm #${productId}`);
    }

    // Load brand prefix
    let brandPrefix = 'SHOE';
    if (product.brandId) {
      const brand = await catalogRepository.findBrandById(product.brandId);
      if (brand) {
        brandPrefix = brand.brandName
          .trim()
          .split(/\s+/)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 4);
      }
    }

    // Load all sizes and colors for generating clean SKUs
    const allSizes = await catalogRepository.findAllSizes();
    const allColors = await catalogRepository.findAllColors();

    const sizeMap = new Map(allSizes.map((s) => [s.sizeId, s.sizeLabel]));
    const colorMap = new Map(allColors.map((c) => [c.colorId, c.colorName]));

    // Generate Cartesian product (Tích Descartes: size x màu)
    const combos = [];
    for (const sizeId of sizeIds) {
      const sId = parseInt(sizeId, 10);
      const sizeLabel = sizeMap.get(sId);
      if (!sizeLabel) continue;

      for (const colorId of colorIds) {
        const cId = parseInt(colorId, 10);
        const colorName = colorMap.get(cId);
        if (!colorName) continue;

        const colorCode = colorName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 3);

        // SKU format: BRAND-PRODUCTID-SIZE-COLOR (ví dụ: NK-102-42-BLK)
        const sku = `${brandPrefix}-${productId}-${sizeLabel}-${colorCode || cId}`;

        combos.push({
          sizeId: sId,
          colorId: cId,
          sku,
        });
      }
    }

    if (combos.length === 0) {
      throw new BadRequestError('Không có tổ hợp size và màu hợp lệ nào để tạo');
    }

    const created = await productRepository.bulkCreateVariants(productId, combos, actorUserId);
    const updatedProduct = await productRepository.findById(productId);
    return {
      createdCount: created.length,
      product: updatedProduct,
    };
  },

  async updateVariant(variantId, data, actorUserId = null) {
    validateUpdateVariant(data);

    const variant = await productRepository.findVariantById(variantId);
    if (!variant) {
      throw new NotFoundError(`Không tìm thấy biến thể #${variantId}`);
    }

    if (data.sku) {
      const skuTrim = data.sku.trim();
      const existingSku = await productRepository.findVariantBySku(skuTrim, variantId);
      if (existingSku) {
        throw new ConflictError(`Mã SKU '${skuTrim}' đã được sử dụng`);
      }
      return productRepository.updateVariant(variantId, { sku: skuTrim }, actorUserId);
    }

    return variant;
  },

  async deleteVariant(variantId, actorUserId = null) {
    const variant = await productRepository.findVariantById(variantId);
    if (!variant) {
      throw new NotFoundError(`Không tìm thấy biến thể #${variantId}`);
    }

    return productRepository.deleteVariant(variantId, actorUserId);
  },
};

module.exports = productService;
