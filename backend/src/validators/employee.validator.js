const { BadRequestError } = require('../errors');

const validateCreateEmployee = (data) => {
  const { fullName, username, password, roleName, baseSalary, phone } = data;
  if (!fullName || !fullName.trim()) {
    throw new BadRequestError('Họ và tên nhân viên là bắt buộc');
  }
  if (!username || !username.trim()) {
    throw new BadRequestError('Tên đăng nhập là bắt buộc');
  }
  if (!password || password.length < 8) {
    throw new BadRequestError('Mật khẩu tối thiểu phải từ 8 ký tự');
  }
  if (!roleName || !['ADMIN', 'STAFF'].includes(roleName)) {
    throw new BadRequestError('Vai trò nhân viên phải là ADMIN hoặc STAFF');
  }
  if (baseSalary !== undefined && (isNaN(baseSalary) || Number(baseSalary) < 0)) {
    throw new BadRequestError('Lương cơ bản không được âm');
  }
  if (phone && !/^[0-9+]{9,15}$/.test(phone.trim())) {
    throw new BadRequestError('Số điện thoại không hợp lệ');
  }
};

const validateUpdateEmployee = (data) => {
  const { fullName, baseSalary, phone } = data;
  if (fullName !== undefined && !fullName.trim()) {
    throw new BadRequestError('Họ và tên không được để trống');
  }
  if (baseSalary !== undefined && (isNaN(baseSalary) || Number(baseSalary) < 0)) {
    throw new BadRequestError('Lương cơ bản không được âm');
  }
  if (phone && !/^[0-9+]{9,15}$/.test(phone.trim())) {
    throw new BadRequestError('Số điện thoại không hợp lệ');
  }
};

module.exports = {
  validateCreateEmployee,
  validateUpdateEmployee,
};
