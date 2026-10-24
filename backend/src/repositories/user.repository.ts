import { query, sql, type Executor } from '../config/database';
import type { RoleName, UserType } from '../constants/auth.constant';

export interface UserRow {
  userId: number;
  username: string;
  passwordHash: string;
  roleId: number;
  role: RoleName;
  userType: UserType;
  employeeId: number | null;
  customerId: number | null;
  isLocked: boolean;
}

export interface RoleRow {
  roleId: number;
  name: RoleName;
  userType: UserType;
}

const SELECT_USER = `
  SELECT u.user_id AS userId, u.username, u.password_hash AS passwordHash,
         u.role_id AS roleId, r.role_name AS role, u.user_type AS userType,
         u.employee_id AS employeeId, u.customer_id AS customerId, u.is_locked AS isLocked
  FROM users u JOIN roles r ON r.role_id = u.role_id`;

export const userRepository = {
  async findActiveByUsername(username: string, exec?: Executor): Promise<UserRow | null> {
    const r = await query<UserRow>(
      `${SELECT_USER} WHERE u.username = @username AND u.is_deleted = 0`,
      { username: [sql.NVarChar(50), username] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async findActiveById(userId: number, exec?: Executor): Promise<UserRow | null> {
    const r = await query<UserRow>(
      `${SELECT_USER} WHERE u.user_id = @userId AND u.is_deleted = 0`,
      { userId: [sql.Int, userId] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async usernameExists(username: string, exec?: Executor): Promise<boolean> {
    const r = await query(
      `SELECT 1 AS x FROM users WHERE username = @username AND is_deleted = 0`,
      { username: [sql.NVarChar(50), username] },
      exec,
    );
    return r.recordset.length > 0;
  },

  async findRoleByName(name: string, exec?: Executor): Promise<RoleRow | null> {
    const r = await query<RoleRow>(
      `SELECT role_id AS roleId, role_name AS name, user_type AS userType FROM roles WHERE role_name = @name`,
      { name: [sql.VarChar(30), name] },
      exec,
    );
    return r.recordset[0] ?? null;
  },

  async insert(
    d: {
      username: string;
      passwordHash: string;
      roleId: number;
      userType: UserType;
      employeeId?: number;
      customerId?: number;
    },
    exec?: Executor,
  ): Promise<number> {
    const r = await query<{ id: number }>(
      `INSERT INTO users (username, password_hash, role_id, user_type, employee_id, customer_id)
       VALUES (@username, @hash, @roleId, @userType, @employeeId, @customerId);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`,
      {
        username: [sql.NVarChar(50), d.username],
        hash: [sql.VarChar(255), d.passwordHash],
        roleId: [sql.Int, d.roleId],
        userType: [sql.VarChar(10), d.userType],
        employeeId: [sql.Int, d.employeeId ?? null],
        customerId: [sql.Int, d.customerId ?? null],
      },
      exec,
    );
    return r.recordset[0].id;
  },

  async updatePassword(userId: number, hash: string, exec?: Executor): Promise<void> {
    await query(
      `UPDATE users SET password_hash = @hash WHERE user_id = @userId`,
      { hash: [sql.VarChar(255), hash], userId: [sql.Int, userId] },
      exec,
    );
  },

  // Không dùng OUTPUT ở các UPDATE dưới đây: bảng users có trigger nên SQL Server không cho phép.
  async setLocked(userId: number, isLocked: boolean, exec?: Executor): Promise<void> {
    await query(
      `UPDATE users SET is_locked = @isLocked WHERE user_id = @userId AND is_deleted = 0`,
      { isLocked: [sql.Bit, isLocked], userId: [sql.Int, userId] },
      exec,
    );
  },

  async setRole(userId: number, roleId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE users SET role_id = @roleId WHERE user_id = @userId AND is_deleted = 0`,
      { roleId: [sql.Int, roleId], userId: [sql.Int, userId] },
      exec,
    );
  },

  async softDelete(userId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE users SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE user_id = @userId AND is_deleted = 0`,
      { userId: [sql.Int, userId] },
      exec,
    );
  },

  /** Xóa mềm tài khoản gắn với khách (khi xóa mềm khách). */
  async softDeleteByCustomerId(customerId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE users SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE customer_id = @customerId AND is_deleted = 0`,
      { customerId: [sql.Int, customerId] },
      exec,
    );
  },

  /** Xóa mềm tài khoản gắn với nhân viên (khi xóa mềm nhân viên). */
  async softDeleteByEmployeeId(employeeId: number, exec?: Executor): Promise<void> {
    await query(
      `UPDATE users SET is_deleted = 1, deleted_at = SYSUTCDATETIME() WHERE employee_id = @employeeId AND is_deleted = 0`,
      { employeeId: [sql.Int, employeeId] },
      exec,
    );
  },
};
