const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu nạp dữ liệu mẫu (Seeding Database)...');

  // 1. Xóa dữ liệu cũ theo thứ tự ràng buộc khóa ngoại (nếu cần dọn dẹp)
  await prisma.reviewHelpfulVote.deleteMany();
  await prisma.reviewReply.deleteMany();
  await prisma.reviewImage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productComment.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.userRecommendation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userAddress.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  console.log('✅ Đã dọn dẹp dữ liệu cũ an toàn.');

  // 2. Tạo Roles
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      description: 'Quản trị viên tối cao toàn quyền hệ thống',
      isSystem: true,
    },
  });

  const salesStaffRole = await prisma.role.create({
    data: {
      name: 'SALES_STAFF',
      description: 'Nhân viên bán hàng & chăm sóc khách hàng',
      isSystem: true,
    },
  });

  const warehouseStaffRole = await prisma.role.create({
    data: {
      name: 'WAREHOUSE_STAFF',
      description: 'Nhân viên quản lý kho & kiểm kê tồn hàng',
      isSystem: true,
    },
  });

  const customerRole = await prisma.role.create({
    data: {
      name: 'CUSTOMER',
      description: 'Khách hàng mua sắm qua Mobile App',
      isSystem: true,
    },
  });

  console.log('✅ Đã tạo 4 Vai trò (Roles).');

  // 3. Tạo Permissions
  const permissionsList = [
    { code: 'USER_VIEW', name: 'Xem danh sách người dùng', module: 'USER' },
    { code: 'USER_MANAGE', name: 'Khóa / Mở khóa người dùng', module: 'USER' },
    { code: 'ROLE_MANAGE', name: 'Quản lý ma trận phân quyền', module: 'RBAC' },
    { code: 'PRODUCT_VIEW', name: 'Xem danh mục & sản phẩm', module: 'PRODUCT' },
    { code: 'PRODUCT_MANAGE', name: 'Thêm, sửa, xóa sản phẩm & biến thể', module: 'PRODUCT' },
    { code: 'INVENTORY_VIEW', name: 'Xem tồn kho & cảnh báo', module: 'INVENTORY' },
    { code: 'INVENTORY_MANAGE', name: 'Nhập kho, xuất kho & điều chỉnh tồn', module: 'INVENTORY' },
    { code: 'ORDER_VIEW', name: 'Xem danh sách đơn hàng', module: 'ORDER' },
    { code: 'ORDER_MANAGE', name: 'Duyệt đơn, đổi trạng thái đơn', module: 'ORDER' },
    { code: 'VOUCHER_MANAGE', name: 'Quản lý mã giảm giá & khuyến mãi', module: 'MARKETING' },
    { code: 'BANNER_MANAGE', name: 'Quản lý banner quảng cáo app', module: 'MARKETING' },
    { code: 'REVIEW_MODERATE', name: 'Kiểm duyệt đánh giá & phân tích AI', module: 'REVIEW' },
    { code: 'COMMENT_REPLY', name: 'Trả lời hỏi đáp & kiểm duyệt bình luận', module: 'COMMENT' },
    { code: 'REPORT_VIEW', name: 'Xem biểu đồ doanh thu & báo cáo', module: 'ANALYTICS' },
  ];

  const createdPermissions = [];
  for (const p of permissionsList) {
    const perm = await prisma.permission.create({ data: p });
    createdPermissions.push(perm);
  }
  console.log(`✅ Đã tạo ${createdPermissions.length} Quyền hạn (Permissions).`);

  // 4. Gán quyền vào Roles (RolePermission Matrix)
  // Super Admin: Tất cả các quyền
  for (const perm of createdPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }

  // Sales Staff
  const salesPermCodes = ['PRODUCT_VIEW', 'ORDER_VIEW', 'ORDER_MANAGE', 'VOUCHER_MANAGE', 'REVIEW_MODERATE', 'COMMENT_REPLY'];
  for (const perm of createdPermissions.filter((p) => salesPermCodes.includes(p.code))) {
    await prisma.rolePermission.create({
      data: { roleId: salesStaffRole.id, permissionId: perm.id },
    });
  }

  // Warehouse Staff
  const warehousePermCodes = ['PRODUCT_VIEW', 'INVENTORY_VIEW', 'INVENTORY_MANAGE'];
  for (const perm of createdPermissions.filter((p) => warehousePermCodes.includes(p.code))) {
    await prisma.rolePermission.create({
      data: { roleId: warehouseStaffRole.id, permissionId: perm.id },
    });
  }

  console.log('✅ Đã thiết lập Ma trận phân quyền (Role_Permissions Matrix).');

  // 5. Tạo Users mẫu
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123456', 10);

  const superAdmin = await prisma.user.create({
    data: {
      roleId: superAdminRole.id,
      fullName: 'Quản Trị Viên Hệ Thống',
      email: 'admin@shoesstore.com',
      passwordHash: passwordHash,
      phone: '0901234567',
      isActive: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      roleId: salesStaffRole.id,
      fullName: 'Nguyễn Văn Bán Hàng',
      email: 'staff@shoesstore.com',
      passwordHash: passwordHash,
      phone: '0907654321',
      isActive: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      roleId: customerRole.id,
      fullName: 'Trần Khách Hàng',
      email: 'customer@gmail.com',
      passwordHash: customerPasswordHash,
      phone: '0988776655',
      isActive: true,
    },
  });

  // Tạo địa chỉ nhận hàng mẫu cho khách hàng
  await prisma.userAddress.create({
    data: {
      userId: customerUser.id,
      recipientName: 'Trần Khách Hàng',
      recipientPhone: '0988776655',
      streetAddress: 'Số 123 Đường Nguyễn Huệ',
      ward: 'Phường Bến Nghé',
      district: 'Quận 1',
      provinceCity: 'TP. Hồ Chí Minh',
      isDefault: true,
    },
  });

  console.log('✅ Đã tạo tài khoản Admin, Nhân viên và Khách hàng mẫu.');

  // 6. Danh mục & Thương hiệu & Nhà cung cấp
  const catSneaker = await prisma.category.create({
    data: {
      name: 'Giày Sneaker Thời Trang',
      slug: 'giay-sneaker',
      description: 'Giày thể thao dạo phố, phong cách trẻ trung năng động',
    },
  });

  const catRunning = await prisma.category.create({
    data: {
      name: 'Giày Chạy Bộ (Running)',
      slug: 'giay-chay-bo',
      description: 'Đệm êm ái, bám đường, siêu nhẹ trợ lực đường dài',
    },
  });

  const catBasketball = await prisma.category.create({
    data: {
      name: 'Giày Bóng Rổ (Basketball)',
      slug: 'giay-bong-ro',
      description: 'Bảo vệ mắt cá chân, độ bám sân vượt trội',
    },
  });

  const brandNike = await prisma.brand.create({
    data: { name: 'Nike', slug: 'nike', description: 'Just Do It' },
  });

  const brandAdidas = await prisma.brand.create({
    data: { name: 'Adidas', slug: 'adidas', description: 'Impossible is Nothing' },
  });

  const brandPuma = await prisma.brand.create({
    data: { name: 'Puma', slug: 'puma', description: 'Forever Faster' },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: 'Công ty TNHH Phân Phối Thể Thao Nike Việt Nam',
      contactEmail: 'contact@nikedistributor.vn',
      phone: '02838221234',
      address: 'Tầng 15, Tòa nhà Vincom Center, Quận 1, TP. HCM',
    },
  });

  console.log('✅ Đã tạo Danh mục, Thương hiệu, Nhà cung cấp.');

  // 7. Sản phẩm & Biến thể ngành Giày (Size 38 - 44)
  const productAF1 = await prisma.product.create({
    data: {
      categoryId: catSneaker.id,
      brandId: brandNike.id,
      supplierId: supplier.id,
      name: "Nike Air Force 1 '07 White",
      slug: 'nike-air-force-1-07-white',
      description: 'Mẫu giày sneaker huyền thoại với phối màu trắng tinh khôi, chất liệu da cao cấp và đế đệm Air êm ái suốt ngày dài.',
      gender: 'UNISEX',
      basePrice: 2890000,
      sizeGuideUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772',
      isActive: true,
    },
  });

  // Tạo các biến thể Size cho Nike AF1
  const sizes = ['38', '39', '40', '41', '42', '43', '44'];
  for (const s of sizes) {
    await prisma.productVariant.create({
      data: {
        productId: productAF1.id,
        sku: `NIKE-AF1-WHT-${s}`,
        size: s,
        color: 'Trắng (White)',
        price: 2890000,
        stockQuantity: 25,
        isActive: true,
      },
    });
  }

  const productUltraboost = await prisma.product.create({
    data: {
      categoryId: catRunning.id,
      brandId: brandAdidas.id,
      supplierId: supplier.id,
      name: 'Adidas Ultraboost Light Core Black',
      slug: 'adidas-ultraboost-light-black',
      description: 'Trải nghiệm năng lượng bùng nổ cùng công nghệ đệm Boost nhẹ hơn 30%, thân giày Primeknit ôm chân co giãn tối ưu.',
      gender: 'MEN',
      basePrice: 4200000,
      isActive: true,
    },
  });

  for (const s of ['39', '40', '41', '42', '43']) {
    await prisma.productVariant.create({
      data: {
        productId: productUltraboost.id,
        sku: `ADI-UB-BLK-${s}`,
        size: s,
        color: 'Đen (Core Black)',
        price: 4200000,
        stockQuantity: 18,
        isActive: true,
      },
    });
  }

  console.log('✅ Đã tạo Sản phẩm giày mẫu kèm các biến thể Size 38-44.');

  // 8. Tạo Vouchers khuyến mãi
  await prisma.voucher.create({
    data: {
      code: 'WELCOME10',
      title: 'Giảm 10% cho đơn hàng đầu tiên',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderValue: 1000000,
      maxDiscountAmount: 300000,
      usageLimit: 1000,
      usedCount: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
      isActive: true,
    },
  });

  await prisma.voucher.create({
    data: {
      code: 'FREESHIP',
      title: 'Miễn phí vận chuyển toàn quốc',
      discountType: 'FIXED_AMOUNT',
      discountValue: 40000,
      minOrderValue: 500000,
      usageLimit: 500,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  // 9. Banner quảng cáo ứng dụng
  await prisma.banner.create({
    data: {
      title: 'Bộ Sưu Tập Sneaker Mùa Hè 2026',
      imageUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3',
      linkUrl: '/catalog/giay-sneaker',
      sortOrder: 1,
      isActive: true,
    },
  });

  console.log('🎉 Hoàn tất nạp dữ liệu khởi tạo (Seed completed successfully)!');
  console.log('------------------------------------------------------------');
  console.log('🔑 TÀI KHOẢN ĐĂNG NHẬP MẶC ĐỊNH:');
  console.log('👉 Super Admin : admin@shoesstore.com  / Mật khẩu: Admin@123456');
  console.log('👉 Nhân viên   : staff@shoesstore.com  / Mật khẩu: Admin@123456');
  console.log('👉 Khách hàng  : customer@gmail.com    / Mật khẩu: Customer@123456');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chạy Seed Script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
