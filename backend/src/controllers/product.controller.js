const { productService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

class ProductController {
  getProducts = asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.query);
    sendSuccess(res, result, 'Lấy danh sách sản phẩm giày thành công', 200);
  });

  getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    sendSuccess(res, product, 'Lấy thông tin sản phẩm theo ID thành công', 200);
  });

  getProductBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const product = await productService.getProductDetail(slug);
    sendSuccess(res, product, 'Lấy chi tiết sản phẩm thành công', 200);
  });

  createProduct = asyncHandler(async (req, res) => {
    const newProduct = await productService.createProduct(req.body);
    sendSuccess(res, newProduct, 'Tạo sản phẩm giày mới thành công', 201);
  });

  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedProduct = await productService.updateProduct(id, req.body);
    sendSuccess(res, updatedProduct, 'Cập nhật thông tin sản phẩm thành công', 200);
  });

  toggleProductStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const result = await productService.toggleProductStatus(id, isActive);
    sendSuccess(res, result.product, result.message, 200);
  });
}

module.exports = new ProductController();
