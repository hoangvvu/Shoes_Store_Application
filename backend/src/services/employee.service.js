const employeeRepository = require('../repositories/employee.repository');
const { validateCreateEmployee, validateUpdateEmployee } = require('../validators/employee.validator');
const { hashPassword } = require('../utils/hash.util');
const { NotFoundError, ConflictError, BadRequestError } = require('../errors');

const employeeService = {
  async getEmployees({ q, page, size }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const sizeNum = Math.max(1, Math.min(100, parseInt(size, 10) || 10));
    return employeeRepository.findAll({ q, page: pageNum, size: sizeNum });
  },

  async getEmployeeById(id) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Không tìm thấy nhân viên với ID ${id}`);
    }
    return employee;
  },

  async createEmployee(data, actorUserId = null) {
    validateCreateEmployee(data);

    // Check if username is taken
    const existingUser = await employeeRepository.findUserByUsername(data.username.trim());
    if (existingUser) {
      throw new ConflictError(`Tên đăng nhập '${data.username}' đã được sử dụng`);
    }

    // Find role
    const role = await employeeRepository.findRoleByName(data.roleName, 'EMPLOYEE');
    if (!role) {
      throw new BadRequestError(`Vai trò '${data.roleName}' không hợp lệ cho nhân viên`);
    }

    const passwordHash = await hashPassword(data.password);

    const { employeeId } = await employeeRepository.createWithUser(
      {
        fullName: data.fullName.trim(),
        dateOfBirth: data.dateOfBirth || null,
        address: data.address ? data.address.trim() : null,
        phone: data.phone ? data.phone.trim() : null,
        baseSalary: data.baseSalary !== undefined ? Number(data.baseSalary) : 0,
      },
      {
        username: data.username.trim(),
        passwordHash,
        roleId: role.roleId,
      },
      actorUserId
    );

    return employeeRepository.findById(employeeId);
  },

  async updateEmployee(id, data) {
    validateUpdateEmployee(data);

    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Không tìm thấy nhân viên với ID ${id}`);
    }

    return employeeRepository.update(id, {
      fullName: data.fullName ? data.fullName.trim() : undefined,
      dateOfBirth: data.dateOfBirth,
      address: data.address !== undefined ? (data.address ? data.address.trim() : null) : undefined,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : undefined,
      baseSalary: data.baseSalary !== undefined ? Number(data.baseSalary) : undefined,
    });
  },

  async deleteEmployee(id, actorUserId = null) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Không tìm thấy nhân viên với ID ${id}`);
    }

    return employeeRepository.softDelete(id, actorUserId);
  },

  async getEmployeePerformance(id, { from, to }) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundError(`Không tìm thấy nhân viên với ID ${id}`);
    }

    const performance = await employeeRepository.getPerformance(id, from, to);
    return performance || {
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      totalDeliveredOrders: 0,
      totalRevenue: 0,
    };
  },
};

module.exports = employeeService;
