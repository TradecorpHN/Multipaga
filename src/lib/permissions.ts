// Permission system for Multipaga
// Based on Hyperswitch Control Center permissions

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isAdmin: boolean;
}

export interface UserPermissions {
  userId: string;
  roleId: string;
  permissions: string[];
  isAdmin: boolean;
  merchantId: string;
  profileId: string;
  orgId: string;
}

// Define all available permissions
export const PERMISSIONS: Record<string, Permission> = {
  // Dashboard permissions
  'dashboard.view': {
    id: 'dashboard.view',
    name: 'Ver Dashboard',
    description: 'Permite ver el dashboard principal',
    category: 'Dashboard',
    resource: 'dashboard',
    action: 'view',
  },

  // Payment permissions
  'payments.view': {
    id: 'payments.view',
    name: 'Ver Pagos',
    description: 'Permite ver la lista de pagos',
    category: 'Pagos',
    resource: 'payments',
    action: 'view',
  },
  'payments.create': {
    id: 'payments.create',
    name: 'Crear Pagos',
    description: 'Permite crear nuevos pagos',
    category: 'Pagos',
    resource: 'payments',
    action: 'create',
  },
  'payments.process': {
    id: 'payments.process',
    name: 'Procesar Pagos',
    description: 'Permite procesar y confirmar pagos',
    category: 'Pagos',
    resource: 'payments',
    action: 'process',
  },
  'payments.refund': {
    id: 'payments.refund',
    name: 'Reembolsar Pagos',
    description: 'Permite crear reembolsos',
    category: 'Pagos',
    resource: 'payments',
    action: 'refund',
  },
  'payments.all': {
    id: 'payments.all',
    name: 'Todos los Permisos de Pagos',
    description: 'Acceso completo a todas las funciones de pagos',
    category: 'Pagos',
    resource: 'payments',
    action: 'all',
  },

  // Refund permissions
  'refunds.view': {
    id: 'refunds.view',
    name: 'Ver Reembolsos',
    description: 'Permite ver la lista de reembolsos',
    category: 'Reembolsos',
    resource: 'refunds',
    action: 'view',
  },
  'refunds.create': {
    id: 'refunds.create',
    name: 'Crear Reembolsos',
    description: 'Permite crear nuevos reembolsos',
    category: 'Reembolsos',
    resource: 'refunds',
    action: 'create',
  },
  'refunds.all': {
    id: 'refunds.all',
    name: 'Todos los Permisos de Reembolsos',
    description: 'Acceso completo a todas las funciones de reembolsos',
    category: 'Reembolsos',
    resource: 'refunds',
    action: 'all',
  },

  // Customer permissions
  'customers.view': {
    id: 'customers.view',
    name: 'Ver Clientes',
    description: 'Permite ver la lista de clientes',
    category: 'Clientes',
    resource: 'customers',
    action: 'view',
  },
  'customers.create': {
    id: 'customers.create',
    name: 'Crear Clientes',
    description: 'Permite crear nuevos clientes',
    category: 'Clientes',
    resource: 'customers',
    action: 'create',
  },
  'customers.edit': {
    id: 'customers.edit',
    name: 'Editar Clientes',
    description: 'Permite editar información de clientes',
    category: 'Clientes',
    resource: 'customers',
    action: 'edit',
  },
  'customers.all': {
    id: 'customers.all',
    name: 'Todos los Permisos de Clientes',
    description: 'Acceso completo a todas las funciones de clientes',
    category: 'Clientes',
    resource: 'customers',
    action: 'all',
  },

  // Connector permissions
  'connectors.view': {
    id: 'connectors.view',
    name: 'Ver Conectores',
    description: 'Permite ver la configuración de conectores',
    category: 'Conectores',
    resource: 'connectors',
    action: 'view',
  },
  'connectors.configure': {
    id: 'connectors.configure',
    name: 'Configurar Conectores',
    description: 'Permite configurar conectores de pago',
    category: 'Conectores',
    resource: 'connectors',
    action: 'configure',
  },

  // Analytics permissions
  'analytics.view': {
    id: 'analytics.view',
    name: 'Ver Analíticas',
    description: 'Permite ver reportes y analíticas',
    category: 'Analíticas',
    resource: 'analytics',
    action: 'view',
  },

  // Settings permissions
  'settings.view': {
    id: 'settings.view',
    name: 'Ver Configuración',
    description: 'Permite ver la configuración del sistema',
    category: 'Configuración',
    resource: 'settings',
    action: 'view',
  },
  'settings.edit': {
    id: 'settings.edit',
    name: 'Editar Configuración',
    description: 'Permite editar la configuración del sistema',
    category: 'Configuración',
    resource: 'settings',
    action: 'edit',
  },

  // Admin permissions
  'admin.all': {
    id: 'admin.all',
    name: 'Administrador Completo',
    description: 'Acceso completo a todas las funciones del sistema',
    category: 'Administración',
    resource: 'admin',
    action: 'all',
  },
};

// Define predefined roles
export const ROLES: Record<string, Role> = {
  'admin': {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso completo a todas las funciones',
    permissions: ['admin.all'],
    isAdmin: true,
  },
  'operator': {
    id: 'operator',
    name: 'Operador',
    description: 'Puede procesar pagos y ver información básica',
    permissions: [
      'dashboard.view',
      'payments.view',
      'payments.create',
      'payments.process',
      'customers.view',
      'customers.create',
      'analytics.view',
    ],
    isAdmin: false,
  },
  'viewer': {
    id: 'viewer',
    name: 'Visualizador',
    description: 'Solo puede ver información, sin permisos de modificación',
    permissions: [
      'dashboard.view',
      'payments.view',
      'customers.view',
      'analytics.view',
    ],
    isAdmin: false,
  },
  'finance': {
    id: 'finance',
    name: 'Finanzas',
    description: 'Puede ver pagos, crear reembolsos y ver analíticas',
    permissions: [
      'dashboard.view',
      'payments.view',
      'refunds.view',
      'refunds.create',
      'customers.view',
      'analytics.view',
    ],
    isAdmin: false,
  },
};

// Permission checking functions
export class PermissionChecker {
  private userPermissions: UserPermissions;

  constructor(userPermissions: UserPermissions) {
    this.userPermissions = userPermissions;
  }

  // Check if user has a specific permission
  hasPermission(permissionId: string): boolean {
    // Admin users have all permissions
    if (this.userPermissions.isAdmin) {
      return true;
    }

    // Check if user has admin.all permission
    if (this.userPermissions.permissions.includes('admin.all')) {
      return true;
    }

    // Check for specific permission
    if (this.userPermissions.permissions.includes(permissionId)) {
      return true;
    }

    // Check for wildcard permissions (e.g., payments.all covers payments.view)
    const [resource, action] = permissionId.split('.');
    const wildcardPermission = `${resource}.all`;
    if (this.userPermissions.permissions.includes(wildcardPermission)) {
      return true;
    }

    return false;
  }

  // Check if user can access a specific resource
  canAccess(resource: string, action?: string): boolean {
    if (action) {
      return this.hasPermission(`${resource}.${action}`);
    }

    // Check if user has any permission for this resource
    return this.userPermissions.permissions.some(permission => 
      permission.startsWith(`${resource}.`) || permission === 'admin.all'
    ) || this.userPermissions.isAdmin;
  }

  // Get all permissions for a resource
  getResourcePermissions(resource: string): string[] {
    return this.userPermissions.permissions.filter(permission => 
      permission.startsWith(`${resource}.`) || permission === 'admin.all'
    );
  }

  // Check if user can view refunds (special case for admin-only access)
  canViewRefunds(): boolean {
    return this.userPermissions.isAdmin || 
           this.hasPermission('refunds.view') || 
           this.hasPermission('refunds.all') ||
           this.hasPermission('admin.all');
  }

  // Check if user can create refunds (admin or finance role)
  canCreateRefunds(): boolean {
    return this.userPermissions.isAdmin || 
           this.hasPermission('refunds.create') || 
           this.hasPermission('refunds.all') ||
           this.hasPermission('admin.all');
  }

  // Get user's role information
  getRole(): Role | null {
    return ROLES[this.userPermissions.roleId] || null;
  }

  // Get all available permissions for user's role
  getAllowedPermissions(): Permission[] {
    if (this.userPermissions.isAdmin) {
      return Object.values(PERMISSIONS);
    }

    return this.userPermissions.permissions
      .map(permissionId => PERMISSIONS[permissionId])
      .filter(Boolean);
  }
}

// Utility functions
export function createPermissionChecker(userPermissions: UserPermissions): PermissionChecker {
  return new PermissionChecker(userPermissions);
}

export function expandRolePermissions(roleId: string): string[] {
  const role = ROLES[roleId];
  if (!role) return [];

  // If role has admin.all, return all permissions
  if (role.permissions.includes('admin.all')) {
    return Object.keys(PERMISSIONS);
  }

  return role.permissions;
}

export function getUserPermissionsFromSession(sessionData: any): UserPermissions {
  return {
    userId: sessionData.userId,
    roleId: sessionData.roleId || 'viewer',
    permissions: sessionData.permissions || [],
    isAdmin: sessionData.roleId === 'admin' || sessionData.permissions?.includes('admin.all') || false,
    merchantId: sessionData.merchantId,
    profileId: sessionData.profileId,
    orgId: sessionData.orgId,
  };
}

// Navigation items based on permissions
export interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: string;
  requiredPermission?: string;
  adminOnly?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    requiredPermission: 'dashboard.view',
  },
  {
    id: 'payments',
    name: 'Pagos',
    href: '/dashboard/payments',
    icon: 'CreditCard',
    requiredPermission: 'payments.view',
  },
  {
    id: 'customers',
    name: 'Clientes',
    href: '/dashboard/customers',
    icon: 'Users',
    requiredPermission: 'customers.view',
  },
  {
    id: 'refunds',
    name: 'Reembolsos',
    href: '/dashboard/refunds',
    icon: 'RotateCcw',
    requiredPermission: 'refunds.view',
  },
  {
    id: 'analytics',
    name: 'Analíticas',
    href: '/dashboard/analytics',
    icon: 'BarChart3',
    requiredPermission: 'analytics.view',
  },
  {
    id: 'connectors',
    name: 'Conectores',
    href: '/dashboard/connectors',
    icon: 'Plug',
    requiredPermission: 'connectors.view',
    adminOnly: true,
  },
  {
    id: 'settings',
    name: 'Configuración',
    href: '/dashboard/settings',
    icon: 'Settings',
    requiredPermission: 'settings.view',
  },
];

export function getFilteredNavigationItems(permissionChecker: PermissionChecker): NavigationItem[] {
  return NAVIGATION_ITEMS.filter(item => {
    // Check admin-only items
    if (item.adminOnly && !permissionChecker.userPermissions.isAdmin) {
      return false;
    }

    // Check required permission
    if (item.requiredPermission && !permissionChecker.hasPermission(item.requiredPermission)) {
      return false;
    }

    return true;
  });
}

