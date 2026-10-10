export const ROLES = { ADMIN: 'ADMIN', SALES: 'SALES', WAREHOUSE: 'WAREHOUSE', CUSTOMER: 'CUSTOMER' } as const;
export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const USER_TYPES = { EMPLOYEE: 'EMPLOYEE', CUSTOMER: 'CUSTOMER' } as const;
export type UserType = (typeof USER_TYPES)[keyof typeof USER_TYPES];

export const EMPLOYEE_ROLES = [ROLES.ADMIN, ROLES.SALES, ROLES.WAREHOUSE] as const;

/** Cổng đăng nhập: web quản trị (nhân viên + admin) và mobile (khách). */
export const PORTALS = ['staff', 'customer'] as const;
export type Portal = (typeof PORTALS)[number];

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // giới hạn của bcrypt
export const BCRYPT_COST = 12;

export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_FAILS = 5;
