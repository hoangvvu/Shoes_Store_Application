const { orderRepository } = require('../repositories');
const { prisma } = require('../config');
const AppError = require('../errors/AppError');

class OrderService {
  async createOrder(userId, orderData) {
    const { items, voucherId, recipientName, recipientPhone, shippingAddress, paymentMethod, notes } = orderData;

    if (!items || items.length === 0) {
      throw new AppError('Đơn hàng phải có ít nhất một sản phẩm', 400);
    }

    // 1. Kiểm tra tồn kho và lấy thông tin biến thể thực tế
    let subtotalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: true },
      });

      if (!variant) {
        throw new AppError(`Không tìm thấy biến thể sản phẩm ID: ${item.variantId}`, 404);
      }

      if (variant.stockQuantity < item.quantity) {
        throw new AppError(`Sản phẩm ${variant.product.name} (Size: ${variant.size}) chỉ còn ${variant.stockQuantity} đôi trong kho`, 400);
      }

      const itemTotalPrice = Number(variant.price) * item.quantity;
      subtotalAmount += itemTotalPrice;

      validatedItems.push({
        variantId: variant.id,
        productName: variant.product.name,
        size: variant.size,
        color: variant.color,
        unitPrice: variant.price,
        quantity: item.quantity,
        totalPrice: itemTotalPrice,
      });
    }

    // 2. Tính toán giảm giá Voucher (nếu có)
    let discountAmount = 0;
    if (voucherId) {
      const voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
      });

      if (!voucher || !voucher.isActive) {
        throw new AppError('Mã giảm giá không hợp lệ hoặc đã hết hạn', 400);
      }

      if (subtotalAmount < Number(voucher.minOrderValue)) {
        throw new AppError(`Đơn hàng phải từ ${voucher.minOrderValue} đ để áp dụng voucher này`, 400);
      }

      if (voucher.discountType === 'PERCENT') {
        discountAmount = (subtotalAmount * Number(voucher.discountValue)) / 100;
        if (voucher.maxDiscountAmount && discountAmount > Number(voucher.maxDiscountAmount)) {
          discountAmount = Number(voucher.maxDiscountAmount);
        }
      } else {
        discountAmount = Number(voucher.discountValue);
      }
    }

    const shippingFee = subtotalAmount >= 1500000 ? 0 : 30000;
    const totalAmount = Math.max(0, subtotalAmount - discountAmount + shippingFee);

    return orderRepository.createOrder({
      userId,
      voucherId,
      recipientName,
      recipientPhone,
      shippingAddress,
      paymentMethod,
      notes,
      items: validatedItems,
      subtotalAmount,
      discountAmount,
      shippingFee,
      totalAmount,
    });
  }

  async getUserOrders(userId, query) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    return orderRepository.findByUserId(userId, { page, limit });
  }

  async getOrderDetail(id) {
    const order = await orderRepository.findById(id);
    if (!order) {
      throw new AppError('Không tìm thấy đơn hàng', 404);
    }
    return order;
  }
}

module.exports = new OrderService();
