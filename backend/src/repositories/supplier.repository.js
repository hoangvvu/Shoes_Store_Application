const { prisma } = require('../config');

class SupplierRepository {
  async findAll({ page = 1, limit = 10, search }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, suppliers] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { products: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { total, page, limit, suppliers };
  }

  async findById(id) {
    return prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            isActive: true,
          },
          take: 10,
        },
      },
    });
  }

  async findByName(name) {
    if (!name) return null;
    return prisma.supplier.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });
  }

  async findByEmail(email) {
    if (!email) return null;
    return prisma.supplier.findFirst({
      where: {
        contactEmail: { equals: email.trim(), mode: 'insensitive' },
      },
    });
  }

  async findByPhone(phone) {
    if (!phone) return null;
    return prisma.supplier.findFirst({
      where: {
        phone: { equals: phone.trim() },
      },
    });
  }

  async create(data) {
    return prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contactEmail: data.contactEmail ? data.contactEmail.trim().toLowerCase() : null,
        phone: data.phone ? data.phone.trim() : null,
        address: data.address ? data.address.trim() : null,
      },
    });
  }

  async update(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.contactEmail !== undefined) {
      updateData.contactEmail = data.contactEmail ? data.contactEmail.trim().toLowerCase() : null;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone ? data.phone.trim() : null;
    }
    if (data.address !== undefined) {
      updateData.address = data.address ? data.address.trim() : null;
    }

    return prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id) {
    return prisma.supplier.delete({
      where: { id },
    });
  }
}

module.exports = new SupplierRepository();
