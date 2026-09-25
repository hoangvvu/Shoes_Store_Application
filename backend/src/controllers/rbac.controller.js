const { rbacService } = require('../services');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

class RbacController {
  getRoles = asyncHandler(async (req, res) => {
    const roles = await rbacService.getAllRoles();
    sendSuccess(res, roles, 'Lấy danh sách vai trò thành công', 200);
  });

  getPermissions = asyncHandler(async (req, res) => {
    const permissions = await rbacService.getAllPermissions();
    sendSuccess(res, permissions, 'Lấy danh mục quyền hạn thành công', 200);
  });

  updateRolePermissions = asyncHandler(async (req, res) => {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    const updated = await rbacService.updateRolePermissions(roleId, permissionIds);
    sendSuccess(res, updated, 'Cập nhật phân quyền cho vai trò thành công', 200);
  });
}

module.exports = new RbacController();
