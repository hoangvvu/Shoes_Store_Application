import { ROLES } from '../constants/auth.constant';
import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { catalogRepository } from '../repositories/catalog.repository';
import { orderPromotionRepository } from '../repositories/orderPromotion.repository';
import { productRepository } from '../repositories/product.repository';
import type { AuthUser } from '../types/express';
import { toPaged } from '../utils/pagination';
import { setActor } from '../utils/session';
import type {
  BulkVariantsInput,
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
  UpdateVariantInput,
} from '../validators/product.validator';

const NOT_FOUND = () => AppError.notFound('Không tìm thấy sản phẩm', 'PRODUCT_NOT_FOUND');
const VARIANT_NOT_FOUND = () => AppError.notFound('Không tìm thấy biến thể sản phẩm', 'VARIANT_NOT_FOUND');

function colorNameToSkuCode(colorName: string): string {
  const norm = colorName
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (norm.includes('den') || norm.includes('black')) return 'BLK';
  if (norm.includes('trang') || norm.includes('white')) return 'WHT';
  if (norm.includes('xam') || norm.includes('ghi') || norm.includes('gray') || norm.includes('grey')) return 'GRY';
  if (norm.includes('navy')) return 'NVY';
  if (norm.includes('xanh la') || norm.includes('luc') || norm.includes('green')) return 'GRN';
  if (norm.includes('duong') || norm.includes('da troi') || norm.includes('sky')) return 'SKY';
  if (norm.includes('do') || norm.includes('red')) return 'RED';
  if (norm.includes('xanh') || norm.includes('blue')) return 'BLU';
  if (norm.includes('vang') || norm.includes('yellow')) return 'YEL';
  if (norm.includes('cam') || norm.includes('orange')) return 'ORG';
  if (norm.includes('hong') || norm.includes('pink')) return 'PNK';
  if (norm.includes('tim') || norm.includes('purple')) return 'PRP';
  if (norm.includes('nau') || norm.includes('brown')) return 'BRN';
  if (norm.includes('be') || norm.includes('beige')) return 'BEI';
  if (norm.includes('bac') || norm.includes('silver')) return 'SLV';
  if (norm.includes('kim') || norm.includes('gold')) return 'GLD';

  return norm.replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase() || 'COL';
}

export const productService = {
  async list(q: ProductListQuery, user?: AuthUser) {
    const isInternal = user && (user.role === ROLES.ADMIN || user.role === ROLES.SALES || user.role === ROLES.WAREHOUSE);
    const isActive = isInternal ? q.isActive : true;

    const { rows, total } = await productRepository.list({
      q: q.q,
      categoryId: q.categoryId,
      brandId: q.brandId,
      supplierId: q.supplierId,
      isActive,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
      page: q.page,
      size: q.size,
    });

    return toPaged(rows, total, q.page, q.size);
  },

  async getDetail(productId: number) {
    const product = await productRepository.findDetailById(productId);
    if (!product) throw NOT_FOUND();

    const variants = await productRepository.findVariantsByProductId(productId);

    // Tính giá sau khuyến mãi tốt nhất (nếu có)
    let finalPrice: number | null = null;
    const promoMap = await orderPromotionRepository.bestProductPercents([productId]);
    const pct = promoMap.get(productId) ?? 0;
    if (pct > 0) {
      finalPrice = Math.round((product.currentPrice * (100 - pct)) / 100);
    }

    return {
      ...product,
      finalPrice,
      variants,
    };
  },

  async create(actor: AuthUser, input: CreateProductInput) {
    const id = await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      return productRepository.insert(input, tx);
    });
    return this.getDetail(id);
  },

  async update(actor: AuthUser, id: number, input: UpdateProductInput) {
    const existing = await productRepository.findDetailById(id);
    if (!existing) throw NOT_FOUND();

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await productRepository.update(id, input, tx);
    });

    return this.getDetail(id);
  },

  async setActive(actor: AuthUser, id: number, isActive: boolean) {
    const existing = await productRepository.findDetailById(id);
    if (!existing) throw NOT_FOUND();

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await productRepository.setActive(id, isActive, tx);
    });
  },

  async remove(actor: AuthUser, id: number) {
    const existing = await productRepository.findDetailById(id);
    if (!existing) throw NOT_FOUND();

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await productRepository.softDelete(id, tx);
      await productRepository.softDeleteVariantsByProductId(id, tx);
    });
  },

  async bulkVariants(actor: AuthUser, productId: number, input: BulkVariantsInput) {
    const product = await productRepository.findDetailById(productId);
    if (!product) throw NOT_FOUND();

    const [allSizes, allColors] = await Promise.all([
      catalogRepository.listSizes(),
      catalogRepository.listColors(),
    ]);

    const sizeMap = new Map(allSizes.map((s) => [s.sizeId, s.sizeLabel]));
    const colorMap = new Map(allColors.map((c) => [c.colorId, c.colorName]));

    const brandPrefix = product.brandName ? product.brandName.slice(0, 3).toUpperCase() : 'SP';

    let createdCount = 0;
    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);

      for (const sizeId of input.sizeIds) {
        for (const colorId of input.colorIds) {
          const sizeLabel = sizeMap.get(sizeId) ?? String(sizeId);
          const rawColorName = colorMap.get(colorId) ?? String(colorId);
          const colorCode = colorNameToSkuCode(rawColorName);

          let baseSku = `${brandPrefix}-${productId}-${sizeLabel}-${colorCode}`.replace(/\s+/g, '').toUpperCase();
          let sku = baseSku;
          let counter = 1;
          while (await productRepository.skuExists(sku, null, tx)) {
            sku = `${baseSku}-${counter++}`;
          }

          try {
            await productRepository.insertVariant({ productId, sizeId, colorId, sku }, tx);
            createdCount++;
          } catch {
            // Nếu đã tồn tại tổ hợp size-màu, bỏ qua
          }
        }
      }
    });

    return { created: createdCount };
  },

  async updateVariant(actor: AuthUser, variantId: number, input: UpdateVariantInput) {
    const variant = await productRepository.findVariantById(variantId);
    if (!variant) throw VARIANT_NOT_FOUND();

    if (await productRepository.skuExists(input.sku, variantId)) {
      throw AppError.conflict('Mã SKU đã tồn tại', 'SKU_TAKEN');
    }

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await productRepository.updateVariantSku(variantId, input.sku, tx);
    });

    return productRepository.findVariantById(variantId);
  },

  async removeVariant(actor: AuthUser, variantId: number) {
    const variant = await productRepository.findVariantById(variantId);
    if (!variant) throw VARIANT_NOT_FOUND();

    await withTransaction(async (tx) => {
      await setActor(tx, actor.userId);
      await productRepository.softDeleteVariant(variantId, tx);
    });
  },
};
