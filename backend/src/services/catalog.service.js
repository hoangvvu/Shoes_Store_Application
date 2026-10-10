const catalogRepository = require('../repositories/catalog.repository');
const {
  validateCategory,
  validateBrand,
  validateSize,
  validateColor,
} = require('../validators/catalog.validator');
const { NotFoundError, ConflictError, BadRequestError } = require('../errors');

const catalogService = {
  // Categories
  async getCategories() {
    return catalogRepository.findAllCategories();
  },

  async getCategoryById(id) {
    const cat = await catalogRepository.findCategoryById(id);
    if (!cat) throw new NotFoundError(`Không tìm thấy danh mục #${id}`);
    return cat;
  },

  async createCategory(data) {
    validateCategory(data);
    const existing = await catalogRepository.findCategoryByName(data.categoryName.trim());
    if (existing) {
      throw new ConflictError(`Danh mục '${data.categoryName}' đã tồn tại`);
    }
    return catalogRepository.createCategory(data.categoryName.trim());
  },

  async updateCategory(id, data) {
    validateCategory(data);
    const cat = await catalogRepository.findCategoryById(id);
    if (!cat) throw new NotFoundError(`Không tìm thấy danh mục #${id}`);

    const existing = await catalogRepository.findCategoryByName(data.categoryName.trim(), id);
    if (existing) {
      throw new ConflictError(`Danh mục '${data.categoryName}' đã tồn tại`);
    }
    return catalogRepository.updateCategory(id, data.categoryName.trim());
  },

  async deleteCategory(id) {
    const cat = await catalogRepository.findCategoryById(id);
    if (!cat) throw new NotFoundError(`Không tìm thấy danh mục #${id}`);

    const activeCount = await catalogRepository.countActiveProductsInCategory(id);
    if (activeCount > 0) {
      throw new BadRequestError(
        `Không thể xóa danh mục '${cat.categoryName}' vì còn ${activeCount} sản phẩm đang kinh doanh thuộc danh mục này`
      );
    }
    return catalogRepository.deleteCategory(id);
  },

  // Brands
  async getBrands() {
    return catalogRepository.findAllBrands();
  },

  async getBrandById(id) {
    const brand = await catalogRepository.findBrandById(id);
    if (!brand) throw new NotFoundError(`Không tìm thấy thương hiệu #${id}`);
    return brand;
  },

  async createBrand(data) {
    validateBrand(data);
    const existing = await catalogRepository.findBrandByName(data.brandName.trim());
    if (existing) {
      throw new ConflictError(`Thương hiệu '${data.brandName}' đã tồn tại`);
    }
    return catalogRepository.createBrand(data.brandName.trim());
  },

  async updateBrand(id, data) {
    validateBrand(data);
    const brand = await catalogRepository.findBrandById(id);
    if (!brand) throw new NotFoundError(`Không tìm thấy thương hiệu #${id}`);

    const existing = await catalogRepository.findBrandByName(data.brandName.trim(), id);
    if (existing) {
      throw new ConflictError(`Thương hiệu '${data.brandName}' đã tồn tại`);
    }
    return catalogRepository.updateBrand(id, data.brandName.trim());
  },

  async deleteBrand(id) {
    const brand = await catalogRepository.findBrandById(id);
    if (!brand) throw new NotFoundError(`Không tìm thấy thương hiệu #${id}`);
    return catalogRepository.deleteBrand(id);
  },

  // Sizes
  async getSizes() {
    return catalogRepository.findAllSizes();
  },

  async getSizeById(id) {
    const size = await catalogRepository.findSizeById(id);
    if (!size) throw new NotFoundError(`Không tìm thấy cỡ giày #${id}`);
    return size;
  },

  async createSize(data) {
    validateSize(data);
    return catalogRepository.createSize(data.sizeLabel.trim(), Number(data.sortOrder) || 0);
  },

  async updateSize(id, data) {
    validateSize(data);
    const size = await catalogRepository.findSizeById(id);
    if (!size) throw new NotFoundError(`Không tìm thấy cỡ giày #${id}`);
    return catalogRepository.updateSize(id, data.sizeLabel.trim(), Number(data.sortOrder) || 0);
  },

  async deleteSize(id) {
    const size = await catalogRepository.findSizeById(id);
    if (!size) throw new NotFoundError(`Không tìm thấy cỡ giày #${id}`);
    return catalogRepository.deleteSize(id);
  },

  // Colors
  async getColors() {
    return catalogRepository.findAllColors();
  },

  async getColorById(id) {
    const color = await catalogRepository.findColorById(id);
    if (!color) throw new NotFoundError(`Không tìm thấy màu sắc #${id}`);
    return color;
  },

  async createColor(data) {
    validateColor(data);
    return catalogRepository.createColor(
      data.colorName.trim(),
      data.hexCode ? data.hexCode.trim().toUpperCase() : null
    );
  },

  async updateColor(id, data) {
    validateColor(data);
    const color = await catalogRepository.findColorById(id);
    if (!color) throw new NotFoundError(`Không tìm thấy màu sắc #${id}`);
    return catalogRepository.updateColor(
      id,
      data.colorName.trim(),
      data.hexCode ? data.hexCode.trim().toUpperCase() : null
    );
  },

  async deleteColor(id) {
    const color = await catalogRepository.findColorById(id);
    if (!color) throw new NotFoundError(`Không tìm thấy màu sắc #${id}`);
    return catalogRepository.deleteColor(id);
  },
};

module.exports = catalogService;
