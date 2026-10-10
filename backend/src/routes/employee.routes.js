const express = require('express');
const employeeController = require('../controllers/employee.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

// Tất cả thao tác quản lý nhân viên chỉ dành cho ADMIN
router.use(auth, requireRole('ADMIN'));

router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);
router.get('/:id/performance', employeeController.getPerformance);

module.exports = router;
