const { prisma } = require('../config');

class VoucherRepository {
  async findActiveVouchers() {
    const now = new Date();
    return prisma.voucher.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findByCode(code) {
    if (!code) return null;
    return prisma.voucher.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
  }

  async findById(id) {
    return prisma.voucher.findUnique({
      where: { id },
    });
  }

  async findAll({ page = 1, limit = 10, search, isActive }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { code: { contains: search.trim().toUpperCase() } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, vouchers] = await Promise.all([
      prisma.voucher.count({ where }),
      prisma.voucher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
    ]);
    return { total, page, limit, vouchers };
  }

  async create(data) {
    return prisma.voucher.create({
      data: {
        ...data,
        code: data.code.trim().toUpperCase(),
      },
    });
  }

  async update(id, data) {
    const updateData = { ...data };
    if (updateData.code) {
      updateData.code = updateData.code.trim().toUpperCase();
    }
    return prisma.voucher.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id, isActive) {
    return prisma.voucher.update({
      where: { id },
      data: { isActive },
    });
  }
}

module.exports = new VoucherRepository();
