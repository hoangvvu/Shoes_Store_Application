const employeeService = require('../services/employee.service');
const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');

const employeeController = {
  getEmployees: asyncHandler(async (req, res) => {
    const { q, page, size } = req.query;
    const result = await employeeService.getEmployees({ q, page, size });
    return sendSuccess(res, result.items, 'Lấy danh sách nhân viên thành công', 200, {
      page: result.page,
      size: result.size,
      total: result.total,
      totalPages: result.totalPages,
    });
  }),

  getEmployeeById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const employee = await employeeService.getEmployeeById(parseInt(id, 10));
    return sendSuccess(res, employee, 'Lấy chi tiết nhân viên thành công');
  }),

  createEmployee: asyncHandler(async (req, res) => {
    const actorUserId = req.user?.userId || null;
    const employee = await employeeService.createEmployee(req.body, actorUserId);
    return sendSuccess(res, employee, 'Thêm mới nhân viên thành công', 201);
  }),

  updateEmployee: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const employee = await employeeService.updateEmployee(parseInt(id, 10), req.body);
    return sendSuccess(res, employee, 'Cập nhật thông tin nhân viên thành công');
  }),

  deleteEmployee: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const actorUserId = req.user?.userId || null;
    await employeeService.deleteEmployee(parseInt(id, 10), actorUserId);
    return sendSuccess(res, null, 'Xóa mềm nhân viên thành công');
  }),

  getPerformance: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { from, to } = req.query;
    const performance = await employeeService.getPerformance(parseInt(id, 10), { from, to });
    return sendSuccess(res, performance, 'Lấy báo cáo doanh số theo nhân viên thành công');
  }),
};

module.exports = employeeController;
