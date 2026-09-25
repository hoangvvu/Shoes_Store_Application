const { prisma } = require('../config');

class OrderRepository {
  async createOrder({ userId, voucherId, recipientName, recipientPhone, shippingAddress, paymentMethod, notes, items, subtotalAmount, discountAmount, shippingFee, totalAmount }) {
    return prisma.$transaction(async (tx) => {
      // 1. Tạo đơn hàng
      const orderCode = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const order = await tx.order.create({
        data: {
          orderCode,
          userId,
          voucherId,
          recipientName,
          recipientPhone,
          shippingAddress,
          paymentMethod,
          notes,
          subtotalAmount,
          discountAmount,
          shippingFee,
          totalAmount,
          orderItems: {
            create: items.map((item) => ({
              variantId: item.variantId,
              productName: item.productName,
              size: item.size,
              color: item.color,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      // 2. Trừ tồn kho và ghi nhận lịch sử biến động kho
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            staffId: userId,
            type: 'EXPORT_ORDER',
            quantity: -item.quantity,
            notes: `Xuất kho tự động cho đơn hàng ${orderCode}`,
          },
        });
      }

      // 3. Nếu có dùng voucher thì tăng usedCount
      if (voucherId) {
        await tx.voucher.update({
          where: { id: voucherId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return order;
    });
  }

  async findByUserId(userId, { page = 1, limit = 10 }) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          orderItems: {
            include: {
              variant: {
                include: { product: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, orders };
  }

  async findById(id) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            variant: {
              include: { product: true },
            },
          },
        },
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        voucher: true,
      },
    });
  }
}

module.exports = new OrderRepository();
