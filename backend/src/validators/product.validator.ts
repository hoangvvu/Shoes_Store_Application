import { z } from 'zod';
import { paginationQuery } from '../utils/pagination';

export const createCategorySchema = z.object({
  categoryName: z.string({ required_error: 'Vui lòng nhập tên danh mục' }).trim().min(1, 'Tên danh mục không được để trống').max(100),
});
export const updateCategorySchema = createCategorySchema;

export const createBrandSchema = z.object({
  brandName: z.string({ required_error: 'Vui lòng nhập tên thương hiệu' }).trim().min(1, 'Tên thương hiệu không được để trống').max(100),
});
export const updateBrandSchema = createBrandSchema;

export const createSizeSchema = z.object({
  sizeLabel: z.string({ required_error: 'Vui lòng nhập size' }).trim().min(1, 'Size không được để trống').max(10),
  sortOrder: z.coerce.number().int().default(0),
});
export const updateSizeSchema = z.object({
  sizeLabel: z.string().trim().min(1, 'Size không được để trống').max(10).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const hexCodeRegex = /^#[0-9A-Fa-f]{6}$/;

export const createColorSchema = z.object({
  colorName: z.string({ required_error: 'Vui lòng nhập tên màu' }).trim().min(1, 'Tên màu không được để trống').max(30),
  hexCode: z
    .string()
    .trim()
    .regex(hexCodeRegex, 'Mã màu phải bắt đầu bằng # và theo sau bởi 6 ký tự hex (ví dụ: #FFFFFF)')
    .optional()
    .nullable(),
});
export const updateColorSchema = z.object({
  colorName: z.string().trim().min(1, 'Tên màu không được để trống').max(30).optional(),
  hexCode: z
    .string()
    .trim()
    .regex(hexCodeRegex, 'Mã màu phải bắt đầu bằng # và theo sau bởi 6 ký tự hex (ví dụ: #FFFFFF)')
    .optional()
    .nullable(),
});

const optionalNullableId = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}, z.coerce.number().int().positive().nullable().optional());

const optionalQueryId = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  return val;
}, z.coerce.number().int().positive().optional());

const optionalQueryBool = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (val === 'true' || val === true || val === '1' || val === 1) return true;
  if (val === 'false' || val === false || val === '0' || val === 0) return false;
  return undefined;
}, z.boolean().optional());

export const createProductSchema = z.object({
  productName: z.string({ required_error: 'Vui lòng nhập tên sản phẩm' }).trim().min(1, 'Tên sản phẩm không được để trống').max(200),
  categoryId: optionalNullableId,
  brandId: optionalNullableId,
  supplierId: optionalNullableId,
  currentPrice: z.coerce.number({ required_error: 'Vui lòng nhập giá' }).min(0, 'Giá không được âm'),
  unit: z.string().trim().max(20).default('Đôi'),
  description: z.string().trim().max(4000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
});

export const updateProductSchema = z.object({
  productName: z.string().trim().min(1, 'Tên sản phẩm không được để trống').max(200).optional(),
  categoryId: optionalNullableId,
  brandId: optionalNullableId,
  supplierId: optionalNullableId,
  currentPrice: z.coerce.number().min(0, 'Giá không được âm').optional(),
  unit: z.string().trim().max(20).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
});

export const patchProductActiveSchema = z.object({
  isActive: z.boolean({ required_error: 'Thiếu isActive' }),
});

export const productListQuery = paginationQuery.extend({
  q: z.string().trim().optional(),
  categoryId: optionalQueryId,
  brandId: optionalQueryId,
  supplierId: optionalQueryId,
  isActive: optionalQueryBool,
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export const bulkVariantsSchema = z.object({
  sizeIds: z.array(z.coerce.number().int().positive()).min(1, 'Chọn ít nhất 1 size'),
  colorIds: z.array(z.coerce.number().int().positive()).min(1, 'Chọn ít nhất 1 màu'),
});

export const updateVariantSchema = z.object({
  sku: z.string({ required_error: 'Vui lòng nhập SKU' }).trim().min(1, 'SKU không được để trống').max(50),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type CreateSizeInput = z.infer<typeof createSizeSchema>;
export type UpdateSizeInput = z.infer<typeof updateSizeSchema>;
export type CreateColorInput = z.infer<typeof createColorSchema>;
export type UpdateColorInput = z.infer<typeof updateColorSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuery>;
export type BulkVariantsInput = z.infer<typeof bulkVariantsSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
