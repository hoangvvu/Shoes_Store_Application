import { orderPromotionRepository } from '../repositories/orderPromotion.repository';
import { posRepository } from '../repositories/pos.repository';
import { toPaged } from '../utils/pagination';
import type { PosProductQuery } from '../validators/order.validator';

/** Tra cứu cho màn Bán tại quầy. Giá luôn do backend tính lại khi tạo đơn; số ở đây chỉ để hiển thị. */
export const posService = {
  /** Sản phẩm còn bán kèm các biến thể (size × màu), tồn kho, giá gốc và giá sau khuyến mãi sản phẩm. */
  async searchProducts(q: PosProductQuery) {
    const { rows, total } = await posRepository.searchProducts({
      q: q.q || undefined,
      inStock: q.inStock === 'true',
      page: q.page,
      size: q.size,
    });
    const ids = rows.map((r) => r.productId);
    const [variants, percents] = await Promise.all([
      posRepository.listVariants(ids),
      orderPromotionRepository.bestProductPercents(ids),
    ]);

    const items = rows.map((p) => {
      const discountPercent = percents.get(p.productId) ?? 0;
      return {
        ...p,
        discountPercent,
        salePrice: p.unitPrice - Math.round((p.unitPrice * discountPercent) / 100),
        variants: variants
          .filter((v) => v.productId === p.productId)
          .map(({ productId: _pid, ...v }) => v),
      };
    });
    return toPaged(items, total, q.page, q.size);
  },

  paymentMethods() {
    return posRepository.listPaymentMethods();
  },
};
