const productService = require('../services/product.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const productController = {
  getProducts: asyncHandler(async (req, res) => {
    const result = await productService.getProducts(req.query);
    return sendSuccess(res, result.items, 'Lấy danh sách sản phẩm thành công', 200, {
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getProductById: asyncHandler(async (req, res) => {
    const product = await productService.getProductById(parseInt(req.params.id, 10));
    return sendSuccess(res, product, 'Lấy chi tiết sản phẩm thành công');
  }),

  createProduct: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    const product = await productService.createProduct(req.body, actorUserId);
    return sendSuccess(res, product, 'Thêm mới sản phẩm thành công', 201);
  }),

  updateProduct: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    const product = await productService.updateProduct(
      parseInt(req.params.id, 10),
      req.body,
      actorUserId
    );
    return sendSuccess(res, product, 'Cập nhật sản phẩm thành công');
  }),

  toggleActive: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    const { isActive } = req.body;
    const product = await productService.toggleActive(
      parseInt(req.params.id, 10),
      isActive,
      actorUserId
    );
    return sendSuccess(res, product, 'Cập nhật trạng thái kinh doanh thành công');
  }),

  deleteProduct: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    await productService.deleteProduct(parseInt(req.params.id, 10), actorUserId);
    return sendSuccess(res, null, 'Xóa mềm sản phẩm thành công');
  }),

  bulkCreateVariants: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    const result = await productService.bulkCreateVariants(
      parseInt(req.params.id, 10),
      req.body,
      actorUserId
    );
    return sendSuccess(res, result, 'Tạo biến thể hàng loạt thành công', 201);
  }),

  updateVariant: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    const variant = await productService.updateVariant(
      parseInt(req.params.id, 10),
      req.body,
      actorUserId
    );
    return sendSuccess(res, variant, 'Cập nhật biến thể thành công');
  }),

  deleteVariant: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    await productService.deleteVariant(parseInt(req.params.id, 10), actorUserId);
    return sendSuccess(res, null, 'Xóa mềm biến thể thành công');
  }),
};

module.exports = productController;
