import { describe, it, expect } from 'vitest';
import { PermissionService, PERMISSIONS, ROLES } from '../permissions';

describe('PermissionService.hasPermission', () => {
  it('grants access with system.full_access', () => {
    expect(PermissionService.hasPermission(['system.full_access'], 'anything.whatever')).toBe(true);
  });

  it('grants access with direct permission match', () => {
    expect(PermissionService.hasPermission(['content.read', 'clients.read'], 'content.read')).toBe(true);
  });

  it('denies access when permission is missing', () => {
    expect(PermissionService.hasPermission(['content.read'], 'content.write')).toBe(false);
  });

  it('supports wildcard category permissions', () => {
    expect(PermissionService.hasPermission(['content.*'], 'content.read')).toBe(true);
    expect(PermissionService.hasPermission(['content.*'], 'content.write')).toBe(true);
    expect(PermissionService.hasPermission(['content.*'], 'content.delete')).toBe(true);
  });

  it('does not cross-apply wildcard to other categories', () => {
    expect(PermissionService.hasPermission(['content.*'], 'clients.read')).toBe(false);
  });

  it('returns false for empty permissions array', () => {
    expect(PermissionService.hasPermission([], 'content.read')).toBe(false);
  });
});

describe('PermissionService.canManageRole', () => {
  it('allows super_admin to manage all roles', () => {
    expect(PermissionService.canManageRole('super_admin', 'admin')).toBe(true);
    expect(PermissionService.canManageRole('super_admin', 'viewer')).toBe(true);
  });

  it('allows higher hierarchy to manage lower', () => {
    expect(PermissionService.canManageRole('admin', 'manager')).toBe(true);
    expect(PermissionService.canManageRole('admin', 'editor')).toBe(true);
    expect(PermissionService.canManageRole('admin', 'viewer')).toBe(true);
  });

  it('prevents same-level management', () => {
    expect(PermissionService.canManageRole('admin', 'admin')).toBe(false);
  });

  it('prevents lower hierarchy from managing higher', () => {
    expect(PermissionService.canManageRole('viewer', 'admin')).toBe(false);
    expect(PermissionService.canManageRole('editor', 'manager')).toBe(false);
  });

  it('returns false for unknown roles', () => {
    expect(PermissionService.canManageRole('nonexistent', 'admin')).toBe(false);
    expect(PermissionService.canManageRole('admin', 'nonexistent')).toBe(false);
  });
});

describe('PermissionService.getRoleByKey', () => {
  it('returns the correct role', () => {
    const role = PermissionService.getRoleByKey('admin');
    expect(role).not.toBeNull();
    expect(role!.name).toBe('Administrator');
    expect(role!.hierarchy).toBe(90);
  });

  it('returns null for unknown role', () => {
    expect(PermissionService.getRoleByKey('nonexistent')).toBeNull();
  });
});

describe('PermissionService.getPermissionByKey', () => {
  it('returns the correct permission', () => {
    const perm = PermissionService.getPermissionByKey('content.read');
    expect(perm).not.toBeNull();
    expect(perm!.name).toBe('View Content');
    expect(perm!.category).toBe('content');
  });

  it('returns null for unknown permission', () => {
    expect(PermissionService.getPermissionByKey('nonexistent')).toBeNull();
  });
});

describe('PermissionService.getPermissionsByCategory', () => {
  it('returns permissions for content category', () => {
    const perms = PermissionService.getPermissionsByCategory('content');
    expect(perms.length).toBe(4);
    expect(perms.every(p => p.category === 'content')).toBe(true);
  });

  it('returns permissions for system category', () => {
    const perms = PermissionService.getPermissionsByCategory('system');
    expect(perms.length).toBe(2);
  });
});

describe('PermissionService.getRolePermissions', () => {
  it('returns full_access for super_admin', () => {
    const perms = PermissionService.getRolePermissions('super_admin');
    expect(perms).toEqual(['system.full_access']);
  });

  it('returns specific permissions for viewer', () => {
    const perms = PermissionService.getRolePermissions('viewer');
    expect(perms).toContain('content.read');
    expect(perms).toContain('clients.read');
    expect(perms).not.toContain('content.write');
  });

  it('returns empty array for unknown role', () => {
    expect(PermissionService.getRolePermissions('nonexistent')).toEqual([]);
  });
});

describe('PermissionService.getAssignableRoles', () => {
  it('super_admin can assign all roles', () => {
    const roles = PermissionService.getAssignableRoles('super_admin');
    expect(roles.length).toBe(ROLES.length);
  });

  it('admin can assign manager, editor, viewer', () => {
    const roles = PermissionService.getAssignableRoles('admin');
    const keys = roles.map(r => r.key);
    expect(keys).toContain('manager');
    expect(keys).toContain('editor');
    expect(keys).toContain('viewer');
    expect(keys).not.toContain('super_admin');
    expect(keys).not.toContain('admin');
  });

  it('viewer cannot assign any roles', () => {
    const roles = PermissionService.getAssignableRoles('viewer');
    expect(roles.length).toBe(0);
  });

  it('returns empty array for unknown role', () => {
    expect(PermissionService.getAssignableRoles('nonexistent')).toEqual([]);
  });
});

describe('PermissionService.validatePermissions', () => {
  it('validates known permissions', () => {
    const result = PermissionService.validatePermissions(['content.read', 'clients.write']);
    expect(result.valid).toBe(true);
    expect(result.invalidPermissions).toEqual([]);
  });

  it('flags unknown permissions', () => {
    const result = PermissionService.validatePermissions(['content.read', 'fake.permission']);
    expect(result.valid).toBe(false);
    expect(result.invalidPermissions).toEqual(['fake.permission']);
  });

  it('accepts system.full_access as valid', () => {
    const result = PermissionService.validatePermissions(['system.full_access']);
    expect(result.valid).toBe(true);
  });

  it('validates empty array', () => {
    const result = PermissionService.validatePermissions([]);
    expect(result.valid).toBe(true);
  });
});

describe('PermissionService.getPermissionSummary', () => {
  it('reports full access correctly', () => {
    const summary = PermissionService.getPermissionSummary(['system.full_access']);
    expect(summary.hasFullAccess).toBe(true);
    expect(summary.total).toBe(PERMISSIONS.length);
  });

  it('counts permissions by category', () => {
    const summary = PermissionService.getPermissionSummary(['content.read', 'content.write', 'clients.read']);
    expect(summary.hasFullAccess).toBe(false);
    expect(summary.total).toBe(3);
    expect(summary.byCategory['content']).toBe(2);
    expect(summary.byCategory['clients']).toBe(1);
  });
});

describe('PERMISSIONS constant', () => {
  it('has 27 total permissions', () => {
    expect(PERMISSIONS.length).toBe(27);
  });

  it('each permission has required fields', () => {
    PERMISSIONS.forEach(p => {
      expect(p.key).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.category).toBeTruthy();
    });
  });
});

describe('ROLES constant', () => {
  it('has 5 roles', () => {
    expect(ROLES.length).toBe(5);
  });

  it('roles are ordered by hierarchy (super_admin highest)', () => {
    const superAdmin = ROLES.find(r => r.key === 'super_admin');
    const viewer = ROLES.find(r => r.key === 'viewer');
    expect(superAdmin!.hierarchy).toBeGreaterThan(viewer!.hierarchy);
  });
});

describe('sales permissions', () => {
  it('declares sales.read and sales.write in the sales category', () => {
    const keys = PERMISSIONS.filter((p) => p.category === 'sales').map((p) => p.key);
    expect(keys).toEqual(['sales.read', 'sales.write']);
  });

  it('grants both to admin and manager only', () => {
    const roleHas = (role: string, permission: string) =>
      ROLES.find((r) => r.key === role)?.permissions.includes(permission) ?? false;
    expect(roleHas('admin', 'sales.read')).toBe(true);
    expect(roleHas('admin', 'sales.write')).toBe(true);
    expect(roleHas('manager', 'sales.read')).toBe(true);
    expect(roleHas('manager', 'sales.write')).toBe(true);
    expect(roleHas('editor', 'sales.read')).toBe(false);
    expect(roleHas('viewer', 'sales.read')).toBe(false);
  });

  it('lists a Sales category for the permissions UI', () => {
    expect(PermissionService.getCategories().map((c) => c.key)).toContain('sales');
  });
});
