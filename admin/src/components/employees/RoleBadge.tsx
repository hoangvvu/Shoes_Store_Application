import { ROLE_LABEL } from '../../config/roles';
import type { EmployeeRole } from '../../types/auth';

export function RoleBadge({ role }: { role: EmployeeRole }) {
  return <span className={`badge role--${role.toLowerCase()}`}>{ROLE_LABEL[role]}</span>;
}
