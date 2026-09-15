/**
 * Role-Based Permission System
 * Defines permissions, roles, and access control logic
 */

export interface Permission {
  key: string;
  name: string;
  description: string;
  category: 'system' | 'content' | 'users' | 'clients' | 'projects' | 'finance' | 'settings' | 'sales';
}

export interface Role {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  hierarchy: number; // Higher number = more powerful role
}

// Define all available permissions
export const PERMISSIONS: Permission[] = [
  // System permissions
  {
    key: 'system.full_access',
    name: 'Full System Access',
    description: 'Complete access to all system features',
    category: 'system'
  },
  {
    key: 'system.view_analytics',
    name: 'View Analytics',
    description: 'Access to system analytics and reports',
    category: 'system'
  },

  // Content permissions
  {
    key: 'content.read',
    name: 'View Content',
    description: 'View website content and campaigns',
    category: 'content'
  },
  {
    key: 'content.write',
    name: 'Edit Content',
    description: 'Create and edit website content',
    category: 'content'
  },
  {
    key: 'content.delete',
    name: 'Delete Content',
    description: 'Delete website content and campaigns',
    category: 'content'
  },
  {
    key: 'content.publish',
    name: 'Publish Content',
    description: 'Publish content to live website',
    category: 'content'
  },

  // User management permissions
  {
    key: 'users.read',
    name: 'View Users',
    description: 'View authorized users and their details',
    category: 'users'
  },
  {
    key: 'users.write',
    name: 'Manage Users',
    description: 'Create, edit, and manage authorized users',
    category: 'users'
  },
  {
    key: 'users.delete',
    name: 'Delete Users',
    description: 'Remove users from the system',
    category: 'users'
  },
  {
    key: 'users.permissions',
    name: 'Manage Permissions',
    description: 'Assign and modify user permissions',
    category: 'users'
  },

  // Client management permissions
  {
    key: 'clients.read',
    name: 'View Clients',
    description: 'View client information and details',
    category: 'clients'
  },
  {
    key: 'clients.write',
    name: 'Manage Clients',
    description: 'Create, edit, and update client information',
    category: 'clients'
  },
  {
    key: 'clients.delete',
    name: 'Delete Clients',
    description: 'Remove clients from the system',
    category: 'clients'
  },
  {
    key: 'clients.portal',
    name: 'Manage Client Portal',
    description: 'Access and manage client portal settings',
    category: 'clients'
  },

  // Project management permissions
  {
    key: 'projects.read',
    name: 'View Projects',
    description: 'View project information and status',
    category: 'projects'
  },
  {
    key: 'projects.write',
    name: 'Manage Projects',
    description: 'Create, edit, and update projects',
    category: 'projects'
  },
  {
    key: 'projects.delete',
    name: 'Delete Projects',
    description: 'Remove projects from the system',
    category: 'projects'
  },
  {
    key: 'projects.timeline',
    name: 'Manage Timeline',
    description: 'Update project timelines and milestones',
    category: 'projects'
  },

  // Finance permissions
  {
    key: 'finance.read',
    name: 'View Finance',
    description: 'View invoices and financial reports',
    category: 'finance'
  },
  {
    key: 'finance.write',
    name: 'Manage Invoices',
    description: 'Create, edit, and send invoices',
    category: 'finance'
  },
  {
    key: 'finance.delete',
    name: 'Delete Financial Records',
    description: 'Remove invoices and financial records',
    category: 'finance'
  },
  {
    key: 'finance.reports',
    name: 'Financial Reports',
    description: 'Generate and view financial reports',
    category: 'finance'
  },

  // Settings permissions
  {
    key: 'settings.read',
    name: 'View Settings',
    description: 'View system and application settings',
    category: 'settings'
  },
  {
    key: 'settings.write',
    name: 'Manage Settings',
    description: 'Modify system and application settings',
    category: 'settings'
  },
  {
    key: 'settings.security',
    name: 'Security Settings',
    description: 'Manage security settings and authentication',
    category: 'settings'
  },

  // Sales permissions
  {
    key: 'sales.read',
    name: 'View Sales Pipeline',
    description: 'View leads, activity timelines, tasks and meetings',
    category: 'sales'
  },
  {
    key: 'sales.write',
    name: 'Work Sales Pipeline',
    description: 'Change lead stages and owners, add notes, complete tasks',
    category: 'sales'
  }
];

// Define roles with their permissions
export const ROLES: Role[] = [
  {
    key: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: ['system.full_access'],
    hierarchy: 100
  },
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Full access to manage users, clients, and projects',
    permissions: [
      'system.view_analytics',
      'content.read', 'content.write', 'content.delete', 'content.publish',
      'users.read', 'users.write', 'users.delete', 'users.permissions',
      'clients.read', 'clients.write', 'clients.delete', 'clients.portal',
      'projects.read', 'projects.write', 'projects.delete', 'projects.timeline',
      'finance.read', 'finance.write', 'finance.delete', 'finance.reports',
      'settings.read', 'settings.write', 'settings.security',
      'sales.read', 'sales.write'
    ],
    hierarchy: 90
  },
  {
    key: 'manager',
    name: 'Manager',
    description: 'Manage clients, projects, and content creation',
    permissions: [
      'system.view_analytics',
      'content.read', 'content.write', 'content.publish',
      'clients.read', 'clients.write', 'clients.portal',
      'projects.read', 'projects.write', 'projects.timeline',
      'sales.read', 'sales.write'
    ],
    hierarchy: 70
  },
  {
    key: 'editor',
    name: 'Editor',
    description: 'Content creation and client management',
    permissions: [
      'content.read', 'content.write',
      'clients.read', 'clients.write',
      'projects.read', 'projects.write'
    ],
    hierarchy: 50
  },
  {
    key: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to most information',
    permissions: [
      'content.read',
      'clients.read',
      'projects.read'
    ],
    hierarchy: 10
  }
];

export class PermissionService {
  /**
   * Get all permissions
   */
  static getAllPermissions(): Permission[] {
    return PERMISSIONS;
  }

  /**
   * Get all roles
   */
  static getAllRoles(): Role[] {
    return ROLES;
  }

  /**
   * Get permissions by category
   */
  static getPermissionsByCategory(category: Permission['category']): Permission[] {
    return PERMISSIONS.filter(p => p.category === category);
  }

  /**
   * Get role by key
   */
  static getRoleByKey(roleKey: string): Role | null {
    return ROLES.find(r => r.key === roleKey) || null;
  }

  /**
   * Get permission by key
   */
  static getPermissionByKey(permissionKey: string): Permission | null {
    return PERMISSIONS.find(p => p.key === permissionKey) || null;
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Super admin access
    if (userPermissions.includes('system.full_access')) {
      return true;
    }

    // Direct permission check
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Category-level permissions (e.g., content.* for all content permissions)
    const permissionCategory = requiredPermission.split('.')[0];
    if (userPermissions.includes(`${permissionCategory}.*`)) {
      return true;
    }

    return false;
  }

  /**
   * Get effective permissions for a role
   */
  static getRolePermissions(roleKey: string): string[] {
    const role = this.getRoleByKey(roleKey);
    if (!role) return [];

    // Super admin gets all permissions
    if (role.permissions.includes('system.full_access')) {
      return ['system.full_access'];
    }

    return role.permissions;
  }

  /**
   * Check if role can manage another role
   */
  static canManageRole(managerRoleKey: string, targetRoleKey: string): boolean {
    const managerRole = this.getRoleByKey(managerRoleKey);
    const targetRole = this.getRoleByKey(targetRoleKey);

    if (!managerRole || !targetRole) return false;

    // Super admin can manage all
    if (managerRole.permissions.includes('system.full_access')) {
      return true;
    }

    // Check hierarchy - can only manage lower hierarchy roles
    return managerRole.hierarchy > targetRole.hierarchy;
  }

  /**
   * Get available roles that a user can assign
   */
  static getAssignableRoles(currentUserRoleKey: string): Role[] {
    const currentRole = this.getRoleByKey(currentUserRoleKey);
    if (!currentRole) return [];

    // Super admin can assign all roles
    if (currentRole.permissions.includes('system.full_access')) {
      return ROLES;
    }

    // Can only assign roles with lower hierarchy
    return ROLES.filter(role => role.hierarchy < currentRole.hierarchy);
  }

  /**
   * Validate permission string array
   */
  static validatePermissions(permissions: string[]): { valid: boolean; invalidPermissions: string[] } {
    const validPermissionKeys = PERMISSIONS.map(p => p.key);
    const invalidPermissions = permissions.filter(p => 
      !validPermissionKeys.includes(p) && p !== 'system.full_access'
    );

    return {
      valid: invalidPermissions.length === 0,
      invalidPermissions
    };
  }

  /**
   * Get permission categories
   */
  static getCategories(): Array<{ key: Permission['category']; name: string; permissions: Permission[] }> {
    const categories = [
      { key: 'system' as const, name: 'System' },
      { key: 'content' as const, name: 'Content Management' },
      { key: 'users' as const, name: 'User Management' },
      { key: 'clients' as const, name: 'Client Management' },
      { key: 'projects' as const, name: 'Project Management' },
      { key: 'finance' as const, name: 'Finance & Invoicing' },
      { key: 'settings' as const, name: 'Settings & Configuration' },
      { key: 'sales' as const, name: 'Sales Pipeline' }
    ];

    return categories.map(cat => ({
      ...cat,
      permissions: this.getPermissionsByCategory(cat.key)
    }));
  }

  /**
   * Generate permission summary for UI
   */
  static getPermissionSummary(permissions: string[]): {
    total: number;
    byCategory: Record<string, number>;
    hasFullAccess: boolean;
  } {
    const hasFullAccess = permissions.includes('system.full_access');
    
    if (hasFullAccess) {
      return {
        total: PERMISSIONS.length,
        byCategory: Object.fromEntries(
          this.getCategories().map(cat => [cat.key, cat.permissions.length])
        ),
        hasFullAccess: true
      };
    }

    const byCategory: Record<string, number> = {};
    
    this.getCategories().forEach(category => {
      const categoryPermissions = category.permissions.filter(p => 
        permissions.includes(p.key)
      );
      byCategory[category.key] = categoryPermissions.length;
    });

    return {
      total: permissions.length,
      byCategory,
      hasFullAccess: false
    };
  }
}

/**
 * `authorized_users.permissions` is stored as a comma-separated string. Every
 * reader parses it here, so the auth middleware and sales checks agree.
 */
export function parseStoredPermissions(value: unknown): string[] {
  if (typeof value !== 'string' || !value) return [];
  return value
    .split(',')
    .map((permission) => permission.trim())
    .filter((permission) => permission.length > 0);
}
