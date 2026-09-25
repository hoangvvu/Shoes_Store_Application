const { productRepository } = require('../repositories');
const AppError = require('../errors/AppError');

class ProductService {
  async getProducts(queryParams) {
    const page = parseInt(queryParams.page || '1', 10);
    const limit = parseInt(queryParams.limit || '10', 10);
    const { category, brand, gender, search } = queryParams;

    return productRepository.findAll({
      page,
      limit,
      categorySlug: category,
      brandSlug: brand,
      gender,
      search,
    });
  }

  async getProductDetail(slug) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new AppError('Không tìm thấy sản phẩm giày yêu cầu', 404);
    }
    return product;
  }
}

module.exports = new ProductService();
