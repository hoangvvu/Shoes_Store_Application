const { query, transaction, sql } = require('../config/database');
const { mapRowToCamel, mapRowsToCamel } = require('../utils/mapper.util');

const employeeRepository = {
  /**
   * Find paginated employees with search filter
   */
  async findAll({ q = '', page = 1, size = 10 }) {
    const offset = (page - 1) * size;
    const filterSql = q
      ? `AND (e.full_name COLLATE Vietnamese_CI_AI LIKE N'%' + @q + N'%' OR e.phone LIKE '%' + @q + '%')`
      : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM employees e
      WHERE e.is_deleted = 0 ${filterSql}
    `;

    const selectSql = `
      SELECT e.employee_id, e.full_name, e.date_of_birth, e.address, e.phone, e.base_salary,
             u.user_id, u.username, r.role_name, u.is_locked, e.is_deleted
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
      LEFT JOIN roles r ON r.role_id = u.role_id
      WHERE e.is_deleted = 0 ${filterSql}
      ORDER BY e.employee_id DESC
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const countRes = await query(countSql, { q });
    const selectRes = await query(selectSql, { q, offset, size });

    const total = countRes.recordset[0].total;
    return {
      items: mapRowsToCamel(selectRes.recordset),
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  },

  /**
   * Find an employee by ID
   */
  async findById(employeeId) {
    const sqlText = `
      SELECT e.employee_id, e.full_name, e.date_of_birth, e.address, e.phone, e.base_salary,
             u.user_id, u.username, r.role_name, u.is_locked, e.is_deleted
      FROM employees e
      LEFT JOIN users u ON u.employee_id = e.employee_id AND u.is_deleted = 0
      LEFT JOIN roles r ON r.role_id = u.role_id
      WHERE e.employee_id = @employeeId AND e.is_deleted = 0
    `;
    const res = await query(sqlText, { employeeId });
    return mapRowToCamel(res.recordset[0] || null);
  },

  /**
   * Find role by name
   */
  async findRoleByName(roleName, userType = 'EMPLOYEE') {
    const sqlText = `
      SELECT role_id, role_name, user_type
      FROM roles
      WHERE role_name = @roleName AND user_type = @userType
    `;
    const res = await query(sqlText, { roleName, userType });
    return mapRowToCamel(res.recordset[0] || null);
  },

  /**
   * Check if username already exists among active users
   */
  async findUserByUsername(username) {
    const sqlText = `
      SELECT user_id, username
      FROM users
      WHERE username = @username AND is_deleted = 0
    `;
    const res = await query(sqlText, { username });
    return mapRowToCamel(res.recordset[0] || null);
  },

  /**
   * Create an employee together with user login in a single transaction
   */
  async createWithUser({ fullName, dateOfBirth, address, phone, baseSalary }, { username, passwordHash, roleId }, actorUserId = null) {
    return transaction(async (req) => {
      // 1. Insert Employee
      req.input('fullName', sql.NVarChar(100), fullName);
      req.input('dateOfBirth', sql.Date, dateOfBirth || null);
      req.input('address', sql.NVarChar(255), address || null);
      req.input('phone', sql.VarChar(20), phone || null);
      req.input('baseSalary', sql.Decimal(18, 2), baseSalary || 0);

      const empRes = await req.query(`
        INSERT INTO employees (full_name, date_of_birth, address, phone, base_salary)
        OUTPUT INSERTED.employee_id
        VALUES (@fullName, @dateOfBirth, @address, @phone, @baseSalary);
      `);
      const employeeId = empRes.recordset[0].employee_id;

      // 2. Insert User
      req.input('username', sql.NVarChar(50), username);
      req.input('passwordHash', sql.VarChar(255), passwordHash);
      req.input('roleId', sql.Int, roleId);
      req.input('userType', sql.VarChar(10), 'EMPLOYEE');
      req.input('employeeId', sql.Int, employeeId);

      const userRes = await req.query(`
        INSERT INTO users (username, password_hash, role_id, user_type, employee_id)
        OUTPUT INSERTED.user_id
        VALUES (@username, @passwordHash, @roleId, @userType, @employeeId);
      `);
      const userId = userRes.recordset[0].user_id;

      return { employeeId, userId };
    }, actorUserId);
  },

  /**
   * Update employee details and basic salary
   */
  async update(employeeId, { fullName, dateOfBirth, address, phone, baseSalary }) {
    const sqlText = `
      UPDATE employees
      SET full_name     = ISNULL(@fullName, full_name),
          date_of_birth = CASE WHEN @dateOfBirthProvided = 1 THEN @dateOfBirth ELSE date_of_birth END,
          address       = CASE WHEN @addressProvided = 1 THEN @address ELSE address END,
          phone         = CASE WHEN @phoneProvided = 1 THEN @phone ELSE phone END,
          base_salary   = ISNULL(@baseSalary, base_salary)
      WHERE employee_id = @employeeId AND is_deleted = 0;
    `;
    await query(sqlText, {
      employeeId,
      fullName: fullName || null,
      dateOfBirthProvided: dateOfBirth !== undefined ? 1 : 0,
      dateOfBirth: dateOfBirth || null,
      addressProvided: address !== undefined ? 1 : 0,
      address: address || null,
      phoneProvided: phone !== undefined ? 1 : 0,
      phone: phone || null,
      baseSalary: baseSalary !== undefined ? baseSalary : null,
    });
    return this.findById(employeeId);
  },

  /**
   * Soft delete employee with business rule check in transaction
   */
  async softDelete(employeeId, actorUserId = null) {
    return transaction(async (req) => {
      req.input('emp', sql.Int, employeeId);

      // Check for pending/processing orders assigned to employee
      const checkRes = await req.query(`
        IF EXISTS (
          SELECT 1 FROM invoices
          WHERE employee_id = @emp
            AND order_status IN ('PENDING','CONFIRMED','SHIPPING')
            AND is_deleted = 0
        )
        THROW 50020, N'Nhân viên còn đơn đang xử lý, hãy bàn giao trước', 1;
      `);

      // Soft delete employee and their user account
      await req.query(`
        UPDATE employees SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE employee_id = @emp;
        UPDATE users     SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE employee_id = @emp;
      `);

      return true;
    }, actorUserId);
  },

  /**
   * Employee performance report: delivered invoices and revenue
   */
  async getPerformance(employeeId, fromDate = null, toDate = null) {
    const sqlText = `
      SELECT 
        e.employee_id,
        e.full_name,
        COUNT(i.invoice_id) AS total_delivered_orders,
        ISNULL(SUM(i.amount_payable), 0) AS total_revenue
      FROM employees e
      LEFT JOIN invoices i ON i.employee_id = e.employee_id
        AND i.order_status = 'DELIVERED'
        AND i.is_deleted = 0
        AND (@fromDate IS NULL OR i.invoice_date >= @fromDate)
        AND (@toDate IS NULL OR i.invoice_date < @toDate)
      WHERE e.employee_id = @employeeId AND e.is_deleted = 0
      GROUP BY e.employee_id, e.full_name;
    `;
    const res = await query(sqlText, {
      employeeId,
      fromDate: fromDate || null,
      toDate: toDate || null,
    });
    return mapRowToCamel(res.recordset[0] || null);
  },
};

module.exports = employeeRepository;
