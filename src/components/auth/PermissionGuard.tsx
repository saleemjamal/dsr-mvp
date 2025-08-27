import { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { hasPermission, hasAnyPermission, Permission, UserRole } from '@/lib/permissions'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: ReactNode
  role?: UserRole
  context?: {
    storeId?: string
    targetRole?: UserRole
    isOwn?: boolean
    daysSince?: number
    amount?: number
  }
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * @example
 * <PermissionGuard permission={Permission.CREATE_USER}>
 *   <CreateUserButton />
 * </PermissionGuard>
 * 
 * @example
 * <PermissionGuard 
 *   permissions={[Permission.VIEW_ALL_SALES, Permission.VIEW_STORE_SALES]}
 *   requireAll={false}
 * >
 *   <SalesReport />
 * </PermissionGuard>
 */
export function PermissionGuard({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  role,
  context
}: PermissionGuardProps) {
  const { profile } = useAuth()
  
  if (!profile) {
    return <>{fallback}</>
  }

  const userRole = role || (profile.role as UserRole)
  
  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(userRole, permission, context)
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every(p => hasPermission(userRole, p, context))
    } else {
      hasAccess = hasAnyPermission(userRole, permissions, context)
    }
  } else {
    // No permissions specified, default to showing content
    hasAccess = true
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * Hook for checking permissions in components
 */
export function usePermissions() {
  const { profile } = useAuth()
  
  const checkPermission = (
    permission: Permission,
    context?: {
      storeId?: string
      targetRole?: UserRole
      isOwn?: boolean
      daysSince?: number
      amount?: number
    }
  ) => {
    if (!profile) return false
    return hasPermission(profile.role as UserRole, permission, context)
  }

  const checkAnyPermission = (
    permissions: Permission[],
    context?: {
      storeId?: string
      targetRole?: UserRole
      isOwn?: boolean
      daysSince?: number
      amount?: number
    }
  ) => {
    if (!profile) return false
    return hasAnyPermission(profile.role as UserRole, permissions, context)
  }

  const checkAllPermissions = (
    permissions: Permission[],
    context?: {
      storeId?: string
      targetRole?: UserRole
      isOwn?: boolean
      daysSince?: number
      amount?: number
    }
  ) => {
    if (!profile) return false
    return permissions.every(permission => 
      hasPermission(profile.role as UserRole, permission, context)
    )
  }

  return {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    userRole: profile?.role as UserRole,
    profile
  }
}

/**
 * Role-based component guard
 */
interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { profile } = useAuth()
  
  if (!profile) {
    return <>{fallback}</>
  }

  const hasAccess = allowedRoles.includes(profile.role as UserRole)
  
  return hasAccess ? <>{children}</> : <>{fallback}</>
}