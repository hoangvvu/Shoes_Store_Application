import { withTransaction } from '../config/database';
import { AppError } from '../errors/AppError';
import { cartRepository, type Availability, type CartItemRow } from '../repositories/cart.repository';
import type { AuthUser } from '../types/express';
import { setActor } from '../utils/session';
import { isDuplicateKey } from '../utils/sqlError';

/** customerId luôn lấy từ token (chống IDOR). */
function customerIdOf(auth: AuthUser): number {
  if (!auth.customerId) throw AppError.forbidden();
  return auth.customerId;
}

const MESSAGES: Record<Exclude<Availability, 'OK'>, (i: CartItemRow) => string> = {
  UNAVAILABLE: () => 'Sản phẩm không còn kinh doanh',
  OUT_OF_STOCK: () => 'Sản phẩm đã hết hàng',
  INSUFFICIENT_STOCK: (i) => `Kho chỉ còn ${i.stockQuantity} sản phẩm (bạn chọn ${i.quantity})`,
};

const issueOf = (i: CartItemRow) => (i.availability === 'OK' ? null : MESSAGES[i.availability](i));

export interface CartView {
  cartId: number | null;
  items: (CartItemRow & { lineTotal: number; message: string | null })[];
  lineCount: number;
  totalQuantity: number;
  /** Tạm tính theo giá hiện hành; không tính dòng UNAVAILABLE / OUT_OF_STOCK (không mua được). */
  subtotal: number;
  /** Có thể sang bước thanh toán: giỏ không rỗng và mọi dòng đều OK. */
  canCheckout: boolean;
}

async function buildCart(cartId: number | null): Promise<CartView> {
  const rows = cartId ? await cartRepository.listItems(cartId) : [];
  const items = rows.map((r) => ({ ...r, lineTotal: r.unitPrice * r.quantity, message: issueOf(r) }));
  const buyable = items.filter((i) => i.availability === 'OK' || i.availability === 'INSUFFICIENT_STOCK');
  return {
    cartId,
    items,
    lineCount: items.length,
    totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: buyable.reduce((s, i) => s + i.lineTotal, 0),
    canCheckout: items.length > 0 && items.every((i) => i.availability === 'OK'),
  };
}

export const cartService = {
  async getCart(auth: AuthUser): Promise<CartView> {
    return buildCart(await cartRepository.findActiveCartId(customerIdOf(auth)));
  },

  /** Thêm vào giỏ: tự tạo giỏ ACTIVE nếu chưa có; cộng dồn số lượng; khôi phục dòng đã xóa mềm. */
  async addItem(auth: AuthUser, variantId: number, quantity: number) {
    const customerId = customerIdOf(auth);
    const run = () =>
      withTransaction(async (tx) => {
        await setActor(tx, auth.userId);
        if (!(await cartRepository.variantIsSellable(variantId, tx))) {
          throw AppError.notFound('Sản phẩm không tồn tại hoặc đã ngừng kinh doanh', 'VARIANT_UNAVAILABLE');
        }
        const cartId = (await cartRepository.findActiveCartId(customerId, tx)) ?? (await cartRepository.createCart(customerId, tx));
        await cartRepository.upsertItem(cartId, variantId, quantity, tx);
        await cartRepository.touch(cartId, tx);
        return cartId;
      });

    let cartId: number;
    try {
      cartId = await run();
    } catch (err) {
      // 2 request đồng thời cùng tạo giỏ -> uq_cart_active làm 1 request lỗi; thử lại đúng 1 lần
      if (!isDuplicateKey(err, 'uq_cart_active')) throw err;
      cartId = await run();
    }
    return this.withWarning(await buildCart(cartId), variantId);
  },

  /** Số lượng phải > 0 (validator). Vượt tồn chỉ cảnh báo, không chặn. */
  async updateQuantity(auth: AuthUser, variantId: number, quantity: number) {
    const cartId = await this.requireCartId(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      if ((await cartRepository.setQuantity(cartId, variantId, quantity, tx)) === 0) {
        throw AppError.notFound('Sản phẩm không có trong giỏ', 'CART_ITEM_NOT_FOUND');
      }
      await cartRepository.touch(cartId, tx);
    });
    return this.withWarning(await buildCart(cartId), variantId);
  },

  async removeItem(auth: AuthUser, variantId: number) {
    const cartId = await this.requireCartId(auth);
    await withTransaction(async (tx) => {
      await setActor(tx, auth.userId);
      if ((await cartRepository.softDeleteItem(cartId, variantId, tx)) === 0) {
        throw AppError.notFound('Sản phẩm không có trong giỏ', 'CART_ITEM_NOT_FOUND');
      }
      await cartRepository.touch(cartId, tx);
    });
    return buildCart(cartId);
  },

  async clear(auth: AuthUser) {
    const cartId = await cartRepository.findActiveCartId(customerIdOf(auth));
    if (cartId) {
      await withTransaction(async (tx) => {
        await setActor(tx, auth.userId);
        await cartRepository.softDeleteAll(cartId, tx);
        await cartRepository.touch(cartId, tx);
      });
    }
    return buildCart(cartId);
  },

  /** Kiểm tra trước thanh toán: báo các dòng có vấn đề; tùy chọn tự loại dòng UNAVAILABLE. */
  async validate(auth: AuthUser, removeUnavailable: boolean) {
    const cartId = await cartRepository.findActiveCartId(customerIdOf(auth));
    if (cartId && removeUnavailable) {
      await withTransaction(async (tx) => {
        await setActor(tx, auth.userId);
        await cartRepository.softDeleteUnavailable(cartId, tx);
        await cartRepository.touch(cartId, tx);
      });
    }
    const cart = await buildCart(cartId);
    const issues = cart.items
      .filter((i) => i.availability !== 'OK')
      .map((i) => ({
        variantId: i.variantId,
        productName: i.productName,
        availability: i.availability,
        quantity: i.quantity,
        stockQuantity: i.stockQuantity,
        message: i.message,
      }));
    return { valid: cart.canCheckout, empty: cart.lineCount === 0, issues, cart };
  },

  async requireCartId(auth: AuthUser): Promise<number> {
    const cartId = await cartRepository.findActiveCartId(customerIdOf(auth));
    if (!cartId) throw AppError.notFound('Giỏ hàng đang trống', 'CART_EMPTY');
    return cartId;
  },

  withWarning(cart: CartView, variantId: number) {
    const line = cart.items.find((i) => i.variantId === variantId);
    return { ...cart, warning: line?.message ?? null };
  },
};
