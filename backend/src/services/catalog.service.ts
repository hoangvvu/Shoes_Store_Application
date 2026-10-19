import { AppError } from '../errors/AppError';
import { catalogRepository } from '../repositories/catalog.repository';
import type {
  CreateBrandInput,
  CreateCategoryInput,
  CreateColorInput,
  CreateSizeInput,
  UpdateColorInput,
  UpdateSizeInput,
} from '../validators/product.validator';

export const catalogService = {
  // Categories
  async listCategories() {
    return catalogRepository.listCategories();
  },

  async createCategory(input: CreateCategoryInput) {
    if (await catalogRepository.categoryNameExists(input.categoryName)) {
      throw AppError.conflict('Tên danh mục đã tồn tại', 'CATEGORY_NAME_TAKEN');
    }
    return catalogRepository.insertCategory(input.categoryName);
  },

  async updateCategory(id: number, input: CreateCategoryInput) {
    const existing = await catalogRepository.findCategoryById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy danh mục', 'CATEGORY_NOT_FOUND');

    if (await catalogRepository.categoryNameExists(input.categoryName, id)) {
      throw AppError.conflict('Tên danh mục đã tồn tại', 'CATEGORY_NAME_TAKEN');
    }
    return catalogRepository.updateCategory(id, input.categoryName);
  },

  async removeCategory(id: number) {
    const existing = await catalogRepository.findCategoryById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy danh mục', 'CATEGORY_NOT_FOUND');

    if (await catalogRepository.hasProductsInCategory(id)) {
      throw AppError.conflict('Không thể xóa danh mục còn sản phẩm', 'CATEGORY_HAS_ACTIVE_PRODUCTS');
    }
    await catalogRepository.softDeleteCategory(id);
  },

  // Brands
  async listBrands() {
    return catalogRepository.listBrands();
  },

  async createBrand(input: CreateBrandInput) {
    if (await catalogRepository.brandNameExists(input.brandName)) {
      throw AppError.conflict('Tên thương hiệu đã tồn tại', 'BRAND_NAME_TAKEN');
    }
    return catalogRepository.insertBrand(input.brandName);
  },

  async updateBrand(id: number, input: CreateBrandInput) {
    const existing = await catalogRepository.findBrandById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy thương hiệu', 'BRAND_NOT_FOUND');

    if (await catalogRepository.brandNameExists(input.brandName, id)) {
      throw AppError.conflict('Tên thương hiệu đã tồn tại', 'BRAND_NAME_TAKEN');
    }
    return catalogRepository.updateBrand(id, input.brandName);
  },

  async removeBrand(id: number) {
    const existing = await catalogRepository.findBrandById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy thương hiệu', 'BRAND_NOT_FOUND');
    await catalogRepository.softDeleteBrand(id);
  },

  // Sizes
  async listSizes() {
    return catalogRepository.listSizes();
  },

  async createSize(input: CreateSizeInput) {
    if (await catalogRepository.sizeLabelExists(input.sizeLabel)) {
      throw AppError.conflict('Size này đã tồn tại', 'SIZE_LABEL_TAKEN');
    }
    return catalogRepository.insertSize(input.sizeLabel, input.sortOrder);
  },

  async updateSize(id: number, input: UpdateSizeInput) {
    const existing = await catalogRepository.findSizeById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy size', 'SIZE_NOT_FOUND');

    if (input.sizeLabel && (await catalogRepository.sizeLabelExists(input.sizeLabel, id))) {
      throw AppError.conflict('Size này đã tồn tại', 'SIZE_LABEL_TAKEN');
    }
    return catalogRepository.updateSize(id, input.sizeLabel, input.sortOrder);
  },

  async removeSize(id: number) {
    const existing = await catalogRepository.findSizeById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy size', 'SIZE_NOT_FOUND');
    await catalogRepository.softDeleteSize(id);
  },

  // Colors
  async listColors() {
    return catalogRepository.listColors();
  },

  async createColor(input: CreateColorInput) {
    if (await catalogRepository.colorNameExists(input.colorName)) {
      throw AppError.conflict('Tên màu đã tồn tại', 'COLOR_NAME_TAKEN');
    }
    return catalogRepository.insertColor(input.colorName, input.hexCode);
  },

  async updateColor(id: number, input: UpdateColorInput) {
    const existing = await catalogRepository.findColorById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy màu', 'COLOR_NOT_FOUND');

    if (input.colorName && (await catalogRepository.colorNameExists(input.colorName, id))) {
      throw AppError.conflict('Tên màu đã tồn tại', 'COLOR_NAME_TAKEN');
    }
    return catalogRepository.updateColor(id, input.colorName, input.hexCode);
  },

  async removeColor(id: number) {
    const existing = await catalogRepository.findColorById(id);
    if (!existing) throw AppError.notFound('Không tìm thấy màu', 'COLOR_NOT_FOUND');
    await catalogRepository.softDeleteColor(id);
  },
};
