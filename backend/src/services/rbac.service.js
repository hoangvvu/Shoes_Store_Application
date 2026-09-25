const { roleRepository } = require('../repositories');
const AppError = require('../errors/AppError');

class RbacService {
  async getAllRoles() {
    return roleRepository.findAll();
  }

  async getAllPermissions() {
    return roleRepository.findAllPermissions();
  }

  async updateRolePermissions(roleId, permissionIds) {
    if (!roleId) {
      throw new AppError('Thiếu roleId cần cập nhật', 400);
    }
    return roleRepository.updateRolePermissions(roleId, permissionIds);
  }
}

module.exports = new RbacService();
