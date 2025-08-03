import {
  PermissionChecker,
  createPermissionChecker,
  expandRolePermissions,
  getUserPermissionsFromSession,
  PERMISSIONS,
  ROLES,
  UserPermissions,
} from '../../src/lib/permissions'

describe('PermissionChecker', () => {
  const mockUserPermissions: UserPermissions = {
    userId: 'user123',
    roleId: 'operator',
    permissions: ['dashboard.view', 'payments.view', 'payments.create', 'customers.view'],
    isAdmin: false,
    merchantId: 'mer123',
    profileId: 'pro123',
    orgId: 'org123',
  }

  const mockAdminPermissions: UserPermissions = {
    userId: 'admin123',
    roleId: 'admin',
    permissions: ['admin.all'],
    isAdmin: true,
    merchantId: 'mer123',
    profileId: 'pro123',
    orgId: 'org123',
  }

  describe('hasPermission', () => {
    it('returns true for admin users regardless of specific permissions', () => {
      const checker = new PermissionChecker(mockAdminPermissions)
      
      expect(checker.hasPermission('payments.view')).toBe(true)
      expect(checker.hasPermission('refunds.create')).toBe(true)
      expect(checker.hasPermission('any.permission')).toBe(true)
    })

    it('returns true for users with admin.all permission', () => {
      const userWithAdminAll: UserPermissions = {
        ...mockUserPermissions,
        permissions: ['admin.all'],
        isAdmin: false,
      }
      const checker = new PermissionChecker(userWithAdminAll)
      
      expect(checker.hasPermission('payments.view')).toBe(true)
      expect(checker.hasPermission('refunds.create')).toBe(true)
    })

    it('returns true for specific permissions user has', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      
      expect(checker.hasPermission('dashboard.view')).toBe(true)
      expect(checker.hasPermission('payments.view')).toBe(true)
      expect(checker.hasPermission('payments.create')).toBe(true)
      expect(checker.hasPermission('customers.view')).toBe(true)
    })

    it('returns false for permissions user does not have', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      
      expect(checker.hasPermission('refunds.view')).toBe(false)
      expect(checker.hasPermission('settings.edit')).toBe(false)
      expect(checker.hasPermission('connectors.configure')).toBe(false)
    })

    it('handles wildcard permissions correctly', () => {
      const userWithWildcard: UserPermissions = {
        ...mockUserPermissions,
        permissions: ['payments.all', 'customers.view'],
      }
      const checker = new PermissionChecker(userWithWildcard)
      
      expect(checker.hasPermission('payments.view')).toBe(true)
      expect(checker.hasPermission('payments.create')).toBe(true)
      expect(checker.hasPermission('payments.refund')).toBe(true)
      expect(checker.hasPermission('customers.view')).toBe(true)
      expect(checker.hasPermission('customers.create')).toBe(false)
    })
  })

  describe('canAccess', () => {
    it('returns true for resources user can access', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      
      expect(checker.canAccess('dashboard')).toBe(true)
      expect(checker.canAccess('payments')).toBe(true)
      expect(checker.canAccess('customers')).toBe(true)
    })

    it('returns false for resources user cannot access', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      
      expect(checker.canAccess('refunds')).toBe(false)
      expect(checker.canAccess('settings')).toBe(false)
    })

    it('checks specific actions when provided', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      
      expect(checker.canAccess('payments', 'view')).toBe(true)
      expect(checker.canAccess('payments', 'create')).toBe(true)
      expect(checker.canAccess('payments', 'refund')).toBe(false)
    })

    it('returns true for admin users', () => {
      const checker = new PermissionChecker(mockAdminPermissions)
      
      expect(checker.canAccess('refunds')).toBe(true)
      expect(checker.canAccess('settings', 'edit')).toBe(true)
    })
  })

  describe('canViewRefunds', () => {
    it('returns true for admin users', () => {
      const checker = new PermissionChecker(mockAdminPermissions)
      expect(checker.canViewRefunds()).toBe(true)
    })

    it('returns true for users with refunds.view permission', () => {
      const userWithRefunds: UserPermissions = {
        ...mockUserPermissions,
        permissions: ['refunds.view'],
      }
      const checker = new PermissionChecker(userWithRefunds)
      expect(checker.canViewRefunds()).toBe(true)
    })

    it('returns false for regular users without refunds permission', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      expect(checker.canViewRefunds()).toBe(false)
    })
  })

  describe('canCreateRefunds', () => {
    it('returns true for admin users', () => {
      const checker = new PermissionChecker(mockAdminPermissions)
      expect(checker.canCreateRefunds()).toBe(true)
    })

    it('returns true for users with refunds.create permission', () => {
      const userWithRefunds: UserPermissions = {
        ...mockUserPermissions,
        permissions: ['refunds.create'],
      }
      const checker = new PermissionChecker(userWithRefunds)
      expect(checker.canCreateRefunds()).toBe(true)
    })

    it('returns false for regular users without refunds permission', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      expect(checker.canCreateRefunds()).toBe(false)
    })
  })

  describe('getRole', () => {
    it('returns correct role for valid roleId', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      const role = checker.getRole()
      
      expect(role).toEqual(ROLES.operator)
      expect(role?.name).toBe('Operador')
    })

    it('returns null for invalid roleId', () => {
      const userWithInvalidRole: UserPermissions = {
        ...mockUserPermissions,
        roleId: 'invalid_role',
      }
      const checker = new PermissionChecker(userWithInvalidRole)
      
      expect(checker.getRole()).toBeNull()
    })
  })

  describe('getAllowedPermissions', () => {
    it('returns all permissions for admin users', () => {
      const checker = new PermissionChecker(mockAdminPermissions)
      const permissions = checker.getAllowedPermissions()
      
      expect(permissions).toEqual(Object.values(PERMISSIONS))
    })

    it('returns only user permissions for regular users', () => {
      const checker = new PermissionChecker(mockUserPermissions)
      const permissions = checker.getAllowedPermissions()
      
      expect(permissions).toHaveLength(4)
      expect(permissions.map(p => p.id)).toEqual([
        'dashboard.view',
        'payments.view',
        'payments.create',
        'customers.view',
      ])
    })
  })
})

describe('Utility Functions', () => {
  describe('createPermissionChecker', () => {
    it('creates a PermissionChecker instance', () => {
      const userPermissions: UserPermissions = {
        userId: 'user123',
        roleId: 'viewer',
        permissions: ['dashboard.view'],
        isAdmin: false,
        merchantId: 'mer123',
        profileId: 'pro123',
        orgId: 'org123',
      }
      
      const checker = createPermissionChecker(userPermissions)
      expect(checker).toBeInstanceOf(PermissionChecker)
      expect(checker.hasPermission('dashboard.view')).toBe(true)
    })
  })

  describe('expandRolePermissions', () => {
    it('returns all permissions for admin role', () => {
      const permissions = expandRolePermissions('admin')
      expect(permissions).toEqual(Object.keys(PERMISSIONS))
    })

    it('returns specific permissions for non-admin roles', () => {
      const permissions = expandRolePermissions('operator')
      expect(permissions).toEqual(ROLES.operator.permissions)
    })

    it('returns empty array for invalid role', () => {
      const permissions = expandRolePermissions('invalid_role')
      expect(permissions).toEqual([])
    })
  })

  describe('getUserPermissionsFromSession', () => {
    it('extracts user permissions from session data', () => {
      const sessionData = {
        userId: 'user123',
        roleId: 'operator',
        permissions: ['dashboard.view', 'payments.view'],
        merchantId: 'mer123',
        profileId: 'pro123',
        orgId: 'org123',
      }
      
      const userPermissions = getUserPermissionsFromSession(sessionData)
      
      expect(userPermissions).toEqual({
        userId: 'user123',
        roleId: 'operator',
        permissions: ['dashboard.view', 'payments.view'],
        isAdmin: false,
        merchantId: 'mer123',
        profileId: 'pro123',
        orgId: 'org123',
      })
    })

    it('sets isAdmin to true for admin role', () => {
      const sessionData = {
        userId: 'admin123',
        roleId: 'admin',
        permissions: ['admin.all'],
        merchantId: 'mer123',
        profileId: 'pro123',
        orgId: 'org123',
      }
      
      const userPermissions = getUserPermissionsFromSession(sessionData)
      expect(userPermissions.isAdmin).toBe(true)
    })

    it('sets isAdmin to true for users with admin.all permission', () => {
      const sessionData = {
        userId: 'user123',
        roleId: 'custom',
        permissions: ['admin.all'],
        merchantId: 'mer123',
        profileId: 'pro123',
        orgId: 'org123',
      }
      
      const userPermissions = getUserPermissionsFromSession(sessionData)
      expect(userPermissions.isAdmin).toBe(true)
    })

    it('handles missing optional fields', () => {
      const sessionData = {
        userId: 'user123',
        merchantId: 'mer123',
        profileId: 'pro123',
        orgId: 'org123',
      }
      
      const userPermissions = getUserPermissionsFromSession(sessionData)
      
      expect(userPermissions.roleId).toBe('viewer')
      expect(userPermissions.permissions).toEqual([])
      expect(userPermissions.isAdmin).toBe(false)
    })
  })
})

describe('Roles and Permissions Constants', () => {
  describe('PERMISSIONS', () => {
    it('contains all expected permission categories', () => {
      const categories = new Set(Object.values(PERMISSIONS).map(p => p.category))
      
      expect(categories).toContain('Dashboard')
      expect(categories).toContain('Pagos')
      expect(categories).toContain('Reembolsos')
      expect(categories).toContain('Clientes')
      expect(categories).toContain('Conectores')
      expect(categories).toContain('Analíticas')
      expect(categories).toContain('Configuración')
      expect(categories).toContain('Administración')
    })

    it('has consistent permission structure', () => {
      Object.values(PERMISSIONS).forEach(permission => {
        expect(permission).toHaveProperty('id')
        expect(permission).toHaveProperty('name')
        expect(permission).toHaveProperty('description')
        expect(permission).toHaveProperty('category')
        expect(permission).toHaveProperty('resource')
        expect(permission).toHaveProperty('action')
        
        expect(typeof permission.id).toBe('string')
        expect(typeof permission.name).toBe('string')
        expect(typeof permission.description).toBe('string')
        expect(typeof permission.category).toBe('string')
        expect(typeof permission.resource).toBe('string')
        expect(typeof permission.action).toBe('string')
      })
    })
  })

  describe('ROLES', () => {
    it('contains all expected roles', () => {
      expect(ROLES).toHaveProperty('admin')
      expect(ROLES).toHaveProperty('operator')
      expect(ROLES).toHaveProperty('viewer')
      expect(ROLES).toHaveProperty('finance')
    })

    it('has consistent role structure', () => {
      Object.values(ROLES).forEach(role => {
        expect(role).toHaveProperty('id')
        expect(role).toHaveProperty('name')
        expect(role).toHaveProperty('description')
        expect(role).toHaveProperty('permissions')
        expect(role).toHaveProperty('isAdmin')
        
        expect(typeof role.id).toBe('string')
        expect(typeof role.name).toBe('string')
        expect(typeof role.description).toBe('string')
        expect(Array.isArray(role.permissions)).toBe(true)
        expect(typeof role.isAdmin).toBe('boolean')
      })
    })

    it('admin role has admin.all permission', () => {
      expect(ROLES.admin.permissions).toContain('admin.all')
      expect(ROLES.admin.isAdmin).toBe(true)
    })

    it('non-admin roles do not have admin.all permission', () => {
      expect(ROLES.operator.permissions).not.toContain('admin.all')
      expect(ROLES.viewer.permissions).not.toContain('admin.all')
      expect(ROLES.finance.permissions).not.toContain('admin.all')
      
      expect(ROLES.operator.isAdmin).toBe(false)
      expect(ROLES.viewer.isAdmin).toBe(false)
      expect(ROLES.finance.isAdmin).toBe(false)
    })
  })
})

