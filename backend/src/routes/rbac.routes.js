const express = require('express');
const router = express.Router();
const { rbacController } = require('../controllers');
const { authenticate, checkPermission } = require('../middleware');
const { PERMISSIONS } = require('../constants/role.constant');

// Tất cả route RBAC đều yêu cầu đăng nhập và có quyền ROLE_MANAGE
router.use(authenticate);

router.get('/roles', checkPermission(PERMISSIONS.ROLE_MANAGE), rbacController.getRoles);
router.get('/permissions', checkPermission(PERMISSIONS.ROLE_MANAGE), rbacController.getPermissions);
router.put('/roles/:roleId/permissions', checkPermission(PERMISSIONS.ROLE_MANAGE), rbacController.updateRolePermissions);

module.exports = router;
