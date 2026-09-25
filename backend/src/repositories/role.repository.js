const { prisma } = require('../config');

class RoleRepository {
  async findAll() {
    return prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByName(name) {
    return prisma.role.findUnique({
      where: { name },
    });
  }

  async findAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async updateRolePermissions(roleId, permissionIds) {
    // Sử dụng transaction để xóa quyền cũ và gán danh sách quyền mới an toàn
    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissionIds && permissionIds.length > 0) {
        const createData = permissionIds.map((pId) => ({
          roleId,
          permissionId: pId,
        }));
        await tx.rolePermission.createMany({
          data: createData,
        });
      }

      return tx.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });
    });
  }
}

module.exports = new RoleRepository();
