const { productRepository } = require('../repositories');
const { prisma } = require('../config');
const AppError = require('../errors/AppError');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

class ProductService {
  async getProducts(queryParams) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = parseInt(queryParams.limit || '10', 10);
    const { category, brand, gender, search } = queryParams;
    const includeInactive = queryParams.includeInactive === 'true' || queryParams.all === 'true';
    let isActive;
    if (queryParams.isActive !== undefined) {
      isActive = queryParams.isActive === 'true';
    }

    return productRepository.findAll({
      page,
      limit,
      categorySlug: category,
      brandSlug: brand,
      gender,
      search,
      includeInactive,
      isActive,
    });
  }

  async getProductDetail(slug) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm giày yêu cầu', 404);
    }
    return product;
  }

  async getProductById(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm giày theo mã định danh', 404);
    }
    return product;
  }

  async createProduct(data) {
    // 1. Kiểm tra Category và Brand có tồn tại
    const [category, brand] = await Promise.all([
      prisma.category.findUnique({ where: { id: data.categoryId } }),
      prisma.brand.findUnique({ where: { id: data.brandId } }),
    ]);

    if (!category) {
      throw new AppError('Danh mục sản phẩm không tồn tại trong hệ thống', 404);
    }
    if (!brand) {
      throw new AppError('Thương hiệu không tồn tại trong hệ thống', 404);
    }

    // 2. Tạo Slug duy nhất
    let targetSlug = data.slug ? slugify(data.slug) : slugify(data.name);
    const existingSlug = await productRepository.findBySlug(targetSlug);
    if (existingSlug) {
      targetSlug = `${targetSlug}-${Date.now().toString().slice(-4)}`;
    }

    const productPayload = {
      name: data.name.trim(),
      slug: targetSlug,
      description: data.description || null,
      gender: data.gender ? data.gender.toUpperCase() : 'UNISEX',
      basePrice: Number(data.basePrice),
      sizeGuideUrl: data.sizeGuideUrl || null,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      categoryId: data.categoryId,
      brandId: data.brandId,
      supplierId: data.supplierId || null,
      variants: data.variants || [],
      images: data.images || [],
    };

    return productRepository.create(productPayload);
  }

  async updateProduct(id, data) {
    // 1. Kiểm tra sản phẩm tồn tại
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm để cập nhật', 404);
    }

    // 2. Nếu có cập nhật category hoặc brand, kiểm tra tồn tại
    if (data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new AppError('Danh mục sản phẩm không tồn tại', 404);
    }
    if (data.brandId) {
      const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });
      if (!brand) throw new AppError('Thương hiệu không tồn tại', 404);
    }

    // 3. Xử lý slug nếu thay đổi
    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.gender !== undefined) updatePayload.gender = data.gender.toUpperCase();
    if (data.basePrice !== undefined) updatePayload.basePrice = Number(data.basePrice);
    if (data.sizeGuideUrl !== undefined) updatePayload.sizeGuideUrl = data.sizeGuideUrl;
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
    if (data.brandId !== undefined) updatePayload.brandId = data.brandId;
    if (data.supplierId !== undefined) updatePayload.supplierId = data.supplierId;
    if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);

    if (data.slug) {
      const newSlug = slugify(data.slug);
      const existing = await productRepository.findBySlug(newSlug);
      if (existing && existing.id !== id) {
        throw new AppError(`Đường dẫn slug "${newSlug}" đã được sử dụng bởi sản phẩm khác`, 409);
      }
      updatePayload.slug = newSlug;
    }

    return productRepository.update(id, updatePayload);
  }

  async toggleProductStatus(id, newStatus) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm giày cần đổi trạng thái', 404);
    }

    const targetStatus = typeof newStatus === 'boolean' ? newStatus : !product.isActive;
    const updated = await productRepository.updateStatus(id, targetStatus);
    return {
      product: updated,
      message: targetStatus ? 'Đã mở khóa và kích hoạt sản phẩm thành công' : 'Đã khóa sản phẩm thành công',
    };
  }
}

module.exports = new ProductService();
