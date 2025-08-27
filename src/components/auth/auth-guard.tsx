"use client"

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Shield } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requiredRole?: 'admin' | 'manager' | 'staff'
  requiredPermission?: 'view' | 'edit' | 'approve'
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole,
  requiredPermission 
}: AuthGuardProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      // Redirect to login with return URL
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`
      router.push(loginUrl)
    }
  }, [user, loading, requireAuth, router, pathname])

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center space-y-4">
            <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check role-based access
  if (requiredRole && profile) {
    const hasRequiredRole = checkUserRole(profile, requiredRole)
    if (!hasRequiredRole) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="p-8 border-destructive/20">
            <CardContent className="text-center space-y-4">
              <Shield className="h-8 w-8 mx-auto text-destructive" />
              <div>
                <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have permission to access this page.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Required role: {requiredRole} | Your role: {profile.role}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  // If user is authenticated and authorized, render children
  return <>{children}</>
}

// Helper function to check user roles
function checkUserRole(profile: any, requiredRole: string): boolean {
  if (!profile) return false

  const roleHierarchy = {
    'staff': 1,
    'manager': 2, 
    'admin': 3
  }

  const userLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userLevel >= requiredLevel
}