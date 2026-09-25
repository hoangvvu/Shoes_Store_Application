const { prisma } = require('../config');

class UserRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        addresses: true,
      },
    });
  }

  async create(data) {
    return prisma.user.create({
      data,
      include: {
        role: true,
      },
    });
  }

  async findAll({ page = 1, limit = 10, search = '' }) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { role: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, users };
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}

module.exports = new UserRepository();
