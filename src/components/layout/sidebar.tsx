"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { UserProfile } from "@/lib/user-service"
import { UserRole, Permission, hasPermission } from "@/lib/permissions"
import { 
  Home, 
  ShoppingCart, 
  Receipt, 
  Gift, 
  BarChart3,
  Settings,
  Users,
  Package,
  FileText,
  Menu,
  RotateCcw,
  Calculator,
  CheckSquare,
  Building,
  DollarSign,
  Search
} from "lucide-react"

interface NavigationItem {
  name: string
  href: string
  icon: any
  permission?: Permission
  roles?: UserRole[]
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    permission: Permission.CREATE_SALE,
  },
  {
    name: "Sales Orders",
    href: "/orders",
    icon: Package,
    permission: Permission.CREATE_SALE,
  },
  {
    name: "Expenses",
    href: "/expenses", 
    icon: Receipt,
    permission: Permission.CREATE_EXPENSE,
  },
  {
    name: "Hand Bills",
    href: "/hand-bills",
    icon: FileText,
    permission: Permission.CREATE_SALE,
  },
  {
    name: "Gift Vouchers",
    href: "/vouchers",
    icon: Gift,
    permission: Permission.CREATE_VOUCHER,
  },
  {
    name: "Returns",
    href: "/returns",
    icon: RotateCcw,
    permission: Permission.CREATE_SALE,
  },
  {
    name: "Cash Management",
    href: "/cash-management",
    icon: Calculator,
    permission: Permission.COUNT_CASH,
  },
  {
    name: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
    roles: [UserRole.SUPER_USER, UserRole.ACCOUNTS_INCHARGE, UserRole.STORE_MANAGER],
  },
  {
    name: "Reconciliation",
    href: "/reconciliation",
    icon: Search,
    permission: Permission.VIEW_RECONCILIATION,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    permission: Permission.CREATE_CUSTOMER,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: [UserRole.SUPER_USER, UserRole.ACCOUNTS_INCHARGE, UserRole.STORE_MANAGER],
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Settings,
    roles: [UserRole.SUPER_USER, UserRole.STORE_MANAGER],
  },
]

const getFilteredNavigation = (userRole: UserRole | string) => {
  return navigation.filter(item => {
    // If no restrictions, show to everyone
    if (!item.permission && !item.roles) {
      return true
    }
    
    // Check role-based access
    if (item.roles) {
      return item.roles.includes(userRole as UserRole)
    }
    
    // Check permission-based access
    if (item.permission) {
      return hasPermission(userRole, item.permission)
    }
    
    return false
  })
}

export function Sidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    // Get current user profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .then(({ data }) => {
            if (data && data.length > 0) {
              setProfile(data[0] as UserProfile)
            }
          })
      }
    })
  }, [])

  // Get navigation items based on user role
  const userNavigation = profile ? getFilteredNavigation(profile.role) : []

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Menu className="h-6 w-6" />
          <span className="">DSR System</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {userNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  isActive && "bg-muted text-primary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}