const catalogService = require('../services/catalog.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const catalogController = {
  // Categories
  getCategories: asyncHandler(async (req, res) => {
    const categories = await catalogService.getCategories();
    return sendSuccess(res, categories, 'Lấy danh sách danh mục thành công');
  }),

  getCategoryById: asyncHandler(async (req, res) => {
    const category = await catalogService.getCategoryById(parseInt(req.params.id, 10));
    return sendSuccess(res, category, 'Lấy thông tin danh mục thành công');
  }),

  createCategory: asyncHandler(async (req, res) => {
    const category = await catalogService.createCategory(req.body);
    return sendSuccess(res, category, 'Tạo mới danh mục thành công', 201);
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const category = await catalogService.updateCategory(parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, category, 'Cập nhật danh mục thành công');
  }),

  deleteCategory: asyncHandler(async (req, res) => {
    await catalogService.deleteCategory(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 'Xóa danh mục thành công');
  }),

  // Brands
  getBrands: asyncHandler(async (req, res) => {
    const brands = await catalogService.getBrands();
    return sendSuccess(res, brands, 'Lấy danh sách thương hiệu thành công');
  }),

  getBrandById: asyncHandler(async (req, res) => {
    const brand = await catalogService.getBrandById(parseInt(req.params.id, 10));
    return sendSuccess(res, brand, 'Lấy thông tin thương hiệu thành công');
  }),

  createBrand: asyncHandler(async (req, res) => {
    const brand = await catalogService.createBrand(req.body);
    return sendSuccess(res, brand, 'Tạo mới thương hiệu thành công', 201);
  }),

  updateBrand: asyncHandler(async (req, res) => {
    const brand = await catalogService.updateBrand(parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, brand, 'Cập nhật thương hiệu thành công');
  }),

  deleteBrand: asyncHandler(async (req, res) => {
    await catalogService.deleteBrand(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 'Xóa thương hiệu thành công');
  }),

  // Sizes
  getSizes: asyncHandler(async (req, res) => {
    const sizes = await catalogService.getSizes();
    return sendSuccess(res, sizes, 'Lấy danh sách cỡ giày thành công');
  }),

  getSizeById: asyncHandler(async (req, res) => {
    const size = await catalogService.getSizeById(parseInt(req.params.id, 10));
    return sendSuccess(res, size, 'Lấy thông tin cỡ giày thành công');
  }),

  createSize: asyncHandler(async (req, res) => {
    const size = await catalogService.createSize(req.body);
    return sendSuccess(res, size, 'Tạo mới cỡ giày thành công', 201);
  }),

  updateSize: asyncHandler(async (req, res) => {
    const size = await catalogService.updateSize(parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, size, 'Cập nhật cỡ giày thành công');
  }),

  deleteSize: asyncHandler(async (req, res) => {
    await catalogService.deleteSize(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 'Xóa cỡ giày thành công');
  }),

  // Colors
  getColors: asyncHandler(async (req, res) => {
    const colors = await catalogService.getColors();
    return sendSuccess(res, colors, 'Lấy danh sách màu sắc thành công');
  }),

  getColorById: asyncHandler(async (req, res) => {
    const color = await catalogService.getColorById(parseInt(req.params.id, 10));
    return sendSuccess(res, color, 'Lấy thông tin màu sắc thành công');
  }),

  createColor: asyncHandler(async (req, res) => {
    const color = await catalogService.createColor(req.body);
    return sendSuccess(res, color, 'Tạo mới màu sắc thành công', 201);
  }),

  updateColor: asyncHandler(async (req, res) => {
    const color = await catalogService.updateColor(parseInt(req.params.id, 10), req.body);
    return sendSuccess(res, color, 'Cập nhật màu sắc thành công');
  }),

  deleteColor: asyncHandler(async (req, res) => {
    await catalogService.deleteColor(parseInt(req.params.id, 10));
    return sendSuccess(res, null, 'Xóa màu sắc thành công');
  }),
};

module.exports = catalogController;
