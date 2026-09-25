const { prisma } = require('../config');

class ProductRepository {
  async findAll({ page = 1, limit = 10, categorySlug, brandSlug, gender, search }) {
    const skip = (page - 1) * limit;
    const where = { isActive: true };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (brandSlug) {
      where.brand = { slug: brandSlug };
    }
    if (gender) {
      where.gender = gender;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          brand: true,
          variants: {
            where: { isActive: true },
            orderBy: { size: 'asc' },
          },
          images: {
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, products };
  }

  async findBySlug(slug) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        supplier: true,
        variants: {
          where: { isActive: true },
          orderBy: { size: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          where: { isVisible: true },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
            images: true,
            replies: {
              include: { staff: { select: { fullName: true } } },
            },
          },
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        },
      },
    });
  }

  async findById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
      },
    });
  }
}

module.exports = new ProductRepository();
