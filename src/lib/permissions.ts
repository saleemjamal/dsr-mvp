// Role-based permissions system for DSR MVP

export enum UserRole {
  SUPER_USER = 'super_user',
  ACCOUNTS_INCHARGE = 'accounts_incharge', 
  STORE_MANAGER = 'store_manager',
  CASHIER = 'cashier'
}

export enum Permission {
  // User Management
  CREATE_USER = 'users.create',
  EDIT_USER = 'users.edit',
  DELETE_USER = 'users.delete',
  VIEW_ALL_USERS = 'users.view_all',
  CREATE_CASHIER = 'users.create_cashier',
  
  // Store Management
  CREATE_STORE = 'stores.create',
  EDIT_STORE = 'stores.edit',
  DELETE_STORE = 'stores.delete',
  VIEW_ALL_STORES = 'stores.view_all',
  
  // Sales Management
  CREATE_SALE = 'sales.create',
  EDIT_SALE = 'sales.edit',
  DELETE_SALE = 'sales.delete',
  VIEW_ALL_SALES = 'sales.view_all',
  VIEW_STORE_SALES = 'sales.view_store',
  VIEW_7DAY_SALES = 'sales.view_7days',
  
  // Expense Management
  CREATE_EXPENSE = 'expenses.create',
  APPROVE_EXPENSE = 'expenses.approve',
  VIEW_ALL_EXPENSES = 'expenses.view_all',
  
  // Cash Management
  COUNT_CASH = 'cash.count',
  TRANSFER_CASH = 'cash.transfer',
  APPROVE_TRANSFER = 'cash.approve',
  REQUEST_TRANSFER = 'cash.request_transfer',
  
  // Customer Management
  CREATE_CUSTOMER = 'customers.create',
  EDIT_CUSTOMER = 'customers.edit',
  VIEW_CUSTOMER = 'customers.view',
  
  // Reports
  VIEW_ALL_REPORTS = 'reports.view_all',
  VIEW_STORE_REPORTS = 'reports.view_store',
  EXPORT_REPORTS = 'reports.export',
  
  // Voucher Management
  CREATE_VOUCHER = 'vouchers.create',
  REDEEM_VOUCHER = 'vouchers.redeem',
  
  // Reconciliation Management
  RECONCILE_TRANSACTIONS = 'reconciliation.reconcile',
  VIEW_RECONCILIATION = 'reconciliation.view',
}

interface PermissionContext {
  storeId?: string
  targetRole?: UserRole
  isOwn?: boolean
  daysSince?: number
  amount?: number
}

// Role hierarchy levels
const ROLE_LEVELS = {
  [UserRole.SUPER_USER]: 4,
  [UserRole.ACCOUNTS_INCHARGE]: 3,
  [UserRole.STORE_MANAGER]: 2,
  [UserRole.CASHIER]: 1,
} as const

// Permission matrix - defines what each role can do
const PERMISSION_MATRIX: Record<UserRole, Partial<Record<Permission, boolean | ((context?: PermissionContext) => boolean)>>> = {
  [UserRole.SUPER_USER]: {
    // Full access to everything
    [Permission.CREATE_USER]: true,
    [Permission.EDIT_USER]: true,
    [Permission.DELETE_USER]: true,
    [Permission.VIEW_ALL_USERS]: true,
    [Permission.CREATE_STORE]: true,
    [Permission.EDIT_STORE]: true,
    [Permission.DELETE_STORE]: true,
    [Permission.VIEW_ALL_STORES]: true,
    [Permission.CREATE_SALE]: true,
    [Permission.EDIT_SALE]: true,
    [Permission.DELETE_SALE]: true,
    [Permission.VIEW_ALL_SALES]: true,
    [Permission.CREATE_EXPENSE]: true,
    [Permission.APPROVE_EXPENSE]: true,
    [Permission.VIEW_ALL_EXPENSES]: true,
    [Permission.COUNT_CASH]: true,
    [Permission.TRANSFER_CASH]: true,
    [Permission.APPROVE_TRANSFER]: true,
    [Permission.CREATE_CUSTOMER]: true,
    [Permission.EDIT_CUSTOMER]: true,
    [Permission.VIEW_CUSTOMER]: true,
    [Permission.VIEW_ALL_REPORTS]: true,
    [Permission.EXPORT_REPORTS]: true,
    [Permission.CREATE_VOUCHER]: true,
    [Permission.REDEEM_VOUCHER]: true,
    [Permission.RECONCILE_TRANSACTIONS]: true,
    [Permission.VIEW_RECONCILIATION]: true,
  },

  [UserRole.ACCOUNTS_INCHARGE]: {
    // Financial oversight and reporting
    [Permission.VIEW_ALL_SALES]: true,
    [Permission.VIEW_ALL_EXPENSES]: true,
    [Permission.APPROVE_EXPENSE]: true,
    [Permission.APPROVE_TRANSFER]: true,
    [Permission.VIEW_ALL_REPORTS]: true,
    [Permission.EXPORT_REPORTS]: true,
    [Permission.VIEW_CUSTOMER]: true,
    [Permission.RECONCILE_TRANSACTIONS]: true,
    [Permission.VIEW_RECONCILIATION]: true,
    // Can view users in stores they have access to
    [Permission.EDIT_USER]: (context) => context?.targetRole === UserRole.CASHIER,
  },

  [UserRole.STORE_MANAGER]: {
    // Store-specific operations
    [Permission.CREATE_CASHIER]: true,
    [Permission.EDIT_USER]: (context) => context?.targetRole === UserRole.CASHIER,
    [Permission.CREATE_SALE]: true,
    [Permission.EDIT_SALE]: (context) => (context?.daysSince || 0) <= 1, // Same day only
    [Permission.VIEW_STORE_SALES]: true,
    [Permission.CREATE_EXPENSE]: true,
    [Permission.APPROVE_EXPENSE]: (context) => (context?.amount || 0) <= 5000, // Small amounts
    [Permission.COUNT_CASH]: true,
    [Permission.REQUEST_TRANSFER]: true,
    [Permission.CREATE_CUSTOMER]: true,
    [Permission.EDIT_CUSTOMER]: true,
    [Permission.VIEW_CUSTOMER]: true,
    [Permission.VIEW_STORE_REPORTS]: true,
    [Permission.CREATE_VOUCHER]: true,
    [Permission.REDEEM_VOUCHER]: true,
  },

  [UserRole.CASHIER]: {
    // Basic operations only
    [Permission.CREATE_SALE]: true,
    [Permission.VIEW_7DAY_SALES]: true,
    [Permission.CREATE_CUSTOMER]: true,
    [Permission.VIEW_CUSTOMER]: true,
    [Permission.COUNT_CASH]: true,
    [Permission.CREATE_VOUCHER]: true,
    [Permission.REDEEM_VOUCHER]: true,
  },
}

/**
 * Check if a user with given role has a specific permission
 */
export function hasPermission(
  role: UserRole | string,
  permission: Permission,
  context?: PermissionContext
): boolean {
  // Convert string role to enum
  const userRole = role as UserRole
  
  if (!userRole || !PERMISSION_MATRIX[userRole]) {
    return false
  }

  const permissionValue = PERMISSION_MATRIX[userRole][permission]
  
  if (typeof permissionValue === 'boolean') {
    return permissionValue
  }
  
  if (typeof permissionValue === 'function') {
    return permissionValue(context)
  }
  
  return false
}

/**
 * Check if role A can manage role B (hierarchy check)
 */
export function canManageRole(managerRole: UserRole | string, targetRole: UserRole | string): boolean {
  const managerLevel = ROLE_LEVELS[managerRole as UserRole] || 0
  const targetLevel = ROLE_LEVELS[targetRole as UserRole] || 0
  
  return managerLevel > targetLevel
}

/**
 * Get the role level (higher number = more permissions)
 */
export function getRoleLevel(role: UserRole | string): number {
  return ROLE_LEVELS[role as UserRole] || 0
}

/**
 * Get human-readable role name
 */
export function getRoleDisplayName(role: UserRole | string): string {
  const roleNames = {
    [UserRole.SUPER_USER]: 'Super User',
    [UserRole.ACCOUNTS_INCHARGE]: 'Accounts Incharge',
    [UserRole.STORE_MANAGER]: 'Store Manager',
    [UserRole.CASHIER]: 'Cashier',
  }
  
  return roleNames[role as UserRole] || 'Unknown Role'
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: UserRole | string): string {
  const roleColors = {
    [UserRole.SUPER_USER]: 'bg-red-100 text-red-800',
    [UserRole.ACCOUNTS_INCHARGE]: 'bg-blue-100 text-blue-800',
    [UserRole.STORE_MANAGER]: 'bg-green-100 text-green-800',
    [UserRole.CASHIER]: 'bg-gray-100 text-gray-800',
  }
  
  return roleColors[role as UserRole] || 'bg-gray-100 text-gray-800'
}

/**
 * Check if user can access a specific store
 */
export function canAccessStore(
  role: UserRole | string,
  userStoreId: string,
  targetStoreId: string
): boolean {
  // Super User and Accounts Incharge can access all stores
  if (role === UserRole.SUPER_USER || role === UserRole.ACCOUNTS_INCHARGE) {
    return true
  }
  
  // Store Manager and Cashier are limited to their assigned store
  return userStoreId === targetStoreId
}

/**
 * Get available actions for a role in a specific module
 */
export function getAvailableActions(role: UserRole | string, module: string): Permission[] {
  const userRole = role as UserRole
  const rolePermissions = PERMISSION_MATRIX[userRole] || {}
  
  return Object.keys(rolePermissions)
    .filter(permission => permission.startsWith(`${module}.`))
    .filter(permission => hasPermission(userRole, permission as Permission))
    .map(permission => permission as Permission)
}

/**
 * Check multiple permissions at once
 */
export function hasAnyPermission(
  role: UserRole | string,
  permissions: Permission[],
  context?: PermissionContext
): boolean {
  return permissions.some(permission => hasPermission(role, permission, context))
}

/**
 * Check if user has all specified permissions
 */
export function hasAllPermissions(
  role: UserRole | string,
  permissions: Permission[],
  context?: PermissionContext
): boolean {
  return permissions.every(permission => hasPermission(role, permission, context))
}

/**
 * Get sales history access days based on role
 */
export function getSalesHistoryDays(role: UserRole | string): number | null {
  switch (role) {
    case UserRole.SUPER_USER:
    case UserRole.ACCOUNTS_INCHARGE:
      return null // Unlimited
    case UserRole.STORE_MANAGER:
      return 90 // 3 months
    case UserRole.CASHIER:
      return 7 // 7 days only
    default:
      return 0
  }
}

/**
 * Export all roles for use in dropdowns, etc.
 */
export const ALL_ROLES = Object.values(UserRole)

/**
 * Get roles that can be created by the given role
 */
export function getCreatableRoles(role: UserRole | string): UserRole[] {
  switch (role) {
    case UserRole.SUPER_USER:
      return [UserRole.ACCOUNTS_INCHARGE, UserRole.STORE_MANAGER, UserRole.CASHIER]
    case UserRole.ACCOUNTS_INCHARGE:
      return [UserRole.STORE_MANAGER, UserRole.CASHIER]
    case UserRole.STORE_MANAGER:
      return [UserRole.CASHIER]
    default:
      return []
  }
}