/** Who may see and change which lead. Admins see everything; managers see their own and unassigned leads. */

import type { AuthenticatedUser } from '@/lib/admin-auth-middleware';
import { parseStoredPermissions, PermissionService } from '@/lib/admin/permissions';

type SalesUser = Pick<AuthenticatedUser, 'id' | 'role' | 'permissions'>;

export function isSalesAdmin(user: Pick<AuthenticatedUser, 'role' | 'permissions'>): boolean {
  return user.role === 'super_admin' || user.role === 'admin' || user.permissions.includes('system.full_access');
}

export function canAccessLead(user: SalesUser, lead: { owner_id: string | null }): boolean {
  return isSalesAdmin(user) || lead.owner_id === null || lead.owner_id === user.id;
}

/** Managers may take an unassigned lead or release their own; admins may assign anyone. */
export function canAssignOwner(user: SalesUser, currentOwnerId: string | null, nextOwnerId: string | null): boolean {
  if (isSalesAdmin(user)) return true;
  return (currentOwnerId === null && nextOwnerId === user.id) || (currentOwnerId === user.id && nextOwnerId === null);
}

/** Whether a stored `authorized_users.permissions` value grants sales.read, parsed as the auth middleware does. */
export function hasSalesAccess(storedPermissions: unknown): boolean {
  return PermissionService.hasPermission(parseStoredPermissions(storedPermissions), 'sales.read');
}
