const { prisma } = require('../config');

class ProductRepository {
  async findAll({ page = 1, limit = 10, categorySlug, brandSlug, gender, search, includeInactive = false, isActive }) {
    const skip = (page - 1) * limit;
    const where = {};

    if (!includeInactive) {
      where.isActive = true;
    } else if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

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
            where: includeInactive ? {} : { isActive: true },
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
        category: true,
        brand: true,
        supplier: true,
        variants: {
          orderBy: { size: 'asc' },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async create(data) {
    const { variants, images, ...productData } = data;
    const createPayload = { ...productData };

    if (Array.isArray(variants) && variants.length > 0) {
      createPayload.variants = {
        create: variants.map((v) => ({
          sku: v.sku,
          size: String(v.size),
          color: v.color || 'Mặc định',
          price: v.price || productData.basePrice,
          stockQuantity: parseInt(v.stockQuantity || '0', 10),
          imageUrl: v.imageUrl || null,
          isActive: v.isActive !== undefined ? v.isActive : true,
        })),
      };
    }

    if (Array.isArray(images) && images.length > 0) {
      createPayload.images = {
        create: images.map((img, index) => ({
          imageUrl: typeof img === 'string' ? img : img.imageUrl,
          isThumbnail: typeof img === 'object' && img.isThumbnail !== undefined ? img.isThumbnail : index === 0,
          sortOrder: typeof img === 'object' && img.sortOrder !== undefined ? img.sortOrder : index,
        })),
      };
    }

    return prisma.product.create({
      data: createPayload,
      include: {
        category: true,
        brand: true,
        variants: true,
        images: true,
      },
    });
  }

  async update(id, data) {
    const { variants, images, ...updateData } = data;
    return prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        brand: true,
        variants: true,
        images: true,
      },
    });
  }

  async updateStatus(id, isActive) {
    return prisma.product.update({
      where: { id },
      data: { isActive },
      include: {
        category: true,
        brand: true,
      },
    });
  }
}

module.exports = new ProductRepository();
