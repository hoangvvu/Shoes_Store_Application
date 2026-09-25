const { productService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

class ProductController {
  getProducts = asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.query);
    sendSuccess(res, result, 'Lấy danh sách sản phẩm giày thành công', 200);
  });

  getProductBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const product = await productService.getProductDetail(slug);
    sendSuccess(res, product, 'Lấy chi tiết sản phẩm thành công', 200);
  });
}

module.exports = new ProductController();
