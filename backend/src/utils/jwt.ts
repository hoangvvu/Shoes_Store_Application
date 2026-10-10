import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import type { RoleName, UserType } from '../constants/auth.constant';
import type { AuthUser } from '../types/express';

interface AccessClaims {
  sub: string;
  role: RoleName;
  type: UserType;
  cid?: number;
  eid?: number;
}

export function signAccessToken(u: AuthUser): string {
  const claims: AccessClaims = {
    sub: String(u.userId),
    role: u.role,
    type: u.userType,
    cid: u.customerId,
    eid: u.employeeId,
  };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const c = jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessClaims;
  return {
    userId: Number(c.sub),
    role: c.role,
    userType: c.type,
    customerId: c.cid,
    employeeId: c.eid,
  };
}

export function verifyRefreshToken(token: string): number {
  const c = jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown as { sub: string };
  return Number(c.sub);
}
