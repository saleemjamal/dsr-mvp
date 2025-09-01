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
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Banknote,
  ArrowRightLeft,
  TrendingUp,
  FolderOpen,
  UserCog,
  MapPin,
  Tags,
  PanelLeftClose,
  PanelLeft
} from "lucide-react"

interface NavigationItem {
  name: string
  href: string
  icon: any
  permission?: Permission
  roles?: UserRole[]
  badge?: number
}

interface NavigationGroup {
  name: string
  icon?: any
  items: NavigationItem[]
  permission?: Permission
  roles?: UserRole[]
  color?: string
}

// Grouped navigation structure
const navigationGroups: NavigationGroup[] = [
  {
    name: "Daily Operations",
    icon: TrendingUp,
    color: "bg-blue-500",
    items: [
      {
        name: "Sales",
        href: "/sales",
        icon: ShoppingCart,
        permission: Permission.CREATE_SALE,
      },
      {
        name: "Expenses",
        href: "/expenses",
        icon: Receipt,
        permission: Permission.CREATE_EXPENSE,
      },
    ]
  },
  {
    name: "Extended Operations",
    icon: Package,
    color: "bg-purple-500",
    items: [
      {
        name: "Sales Orders",
        href: "/orders",
        icon: Package,
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
        name: "Hand Bills",
        href: "/hand-bills",
        icon: FileText,
        permission: Permission.CREATE_SALE,
      },
    ]
  },
  {
    name: "Cash Management",
    icon: Banknote,
    color: "bg-green-500",
    items: [
      {
        name: "Cash Count",
        href: "/cash-management/count",
        icon: Calculator,
        permission: Permission.COUNT_CASH,
      },
      {
        name: "Cash Transfers",
        href: "/cash-management/transfers",
        icon: ArrowRightLeft,
        permission: Permission.TRANSFER_CASH,
      },
      {
        name: "Cash Position",
        href: "/cash-management",
        icon: DollarSign,
        permission: Permission.VIEW_CASH_MANAGEMENT,
      },
      {
        name: "Adjustments",
        href: "/cash-management/adjustment",
        icon: Calculator,
        roles: [UserRole.SUPER_USER, UserRole.STORE_MANAGER],
      },
      {
        name: "Audit Trail",
        href: "/cash-management/audit",
        icon: FileText,
        roles: [UserRole.SUPER_USER, UserRole.ACCOUNTS_INCHARGE],
      },
    ]
  },
  {
    name: "Review & Control",
    icon: CheckSquare,
    color: "bg-orange-500",
    items: [
      {
        name: "Approvals",
        href: "/approvals",
        icon: CheckSquare,
        roles: [UserRole.SUPER_USER], // Only Super Users can approve cash transfers
      },
      {
        name: "Reconciliation",
        href: "/reconciliation",
        icon: Search,
        permission: Permission.VIEW_RECONCILIATION,
      },
      {
        name: "Reports",
        href: "/reports",
        icon: BarChart3,
        roles: [UserRole.SUPER_USER, UserRole.ACCOUNTS_INCHARGE, UserRole.STORE_MANAGER],
      },
    ]
  },
  {
    name: "System",
    icon: Settings,
    color: "bg-gray-500",
    items: [
      {
        name: "Locations",
        href: "/admin/stores",
        icon: MapPin,
        roles: [UserRole.SUPER_USER, UserRole.STORE_MANAGER],
      },
      {
        name: "Users",
        href: "/admin/users",
        icon: UserCog,
        roles: [UserRole.SUPER_USER, UserRole.STORE_MANAGER],
      },
      {
        name: "Customers",
        href: "/customers",
        icon: Users,
        permission: Permission.CREATE_CUSTOMER,
      },
      {
        name: "Categories",
        href: "/admin/expense-categories",
        icon: Tags,
        roles: [UserRole.SUPER_USER, UserRole.STORE_MANAGER],
      },
      {
        name: "Admin Panel",
        href: "/admin",
        icon: Settings,
        roles: [UserRole.SUPER_USER, UserRole.STORE_MANAGER],
      },
    ]
  },
]

// Helper function to filter items based on permissions
const filterNavigationItem = (item: NavigationItem, userRole: UserRole | string) => {
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
}

// Helper function to get filtered groups
const getFilteredGroups = (userRole: UserRole | string) => {
  return navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => filterNavigationItem(item, userRole))
  })).filter(group => group.items.length > 0) // Only show groups with visible items
}

export function Sidebar() {
  const pathname = usePathname()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)

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
    
    // Load saved expanded state from localStorage
    const saved = localStorage.getItem('sidebar-expanded-groups')
    if (saved) {
      setExpandedGroups(new Set(JSON.parse(saved)))
    } else {
      // Default: expand Daily Operations
      setExpandedGroups(new Set(['Daily Operations']))
    }
    
    // Load saved collapsed state
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  // Get filtered navigation groups based on user role
  const userGroups = profile ? getFilteredGroups(profile.role) : []

  // Toggle group expansion
  const toggleGroup = (groupName: string) => {
    if (isCollapsed) return // Don't expand groups when sidebar is collapsed
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName)
    } else {
      newExpanded.add(groupName)
    }
    setExpandedGroups(newExpanded)
    localStorage.setItem('sidebar-expanded-groups', JSON.stringify(Array.from(newExpanded)))
  }
  
  // Toggle sidebar collapse
  const toggleSidebar = () => {
    const newCollapsed = !isCollapsed
    setIsCollapsed(newCollapsed)
    localStorage.setItem('sidebar-collapsed', String(newCollapsed))
  }

  // Check if any item in a group is active
  const isGroupActive = (group: NavigationGroup) => {
    return group.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))
  }

  return (
    <div className={cn(
      "flex h-full max-h-screen flex-col gap-2 transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="flex h-20 items-center border-b px-4">
        <button 
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full group"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <div className={cn(
            "relative p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 hover:shadow-md",
            isCollapsed ? "p-2" : "p-3"
          )}>
            <img 
              src="/images/logo.png" 
              alt="Company Logo"
              className={cn(
                "object-contain transition-all duration-300",
                isCollapsed ? "h-8 w-8" : "h-12 w-auto max-w-[180px]"
              )}
              onError={(e) => {
                // Fallback to text if image fails to load
                e.currentTarget.parentElement!.style.display = 'none';
                e.currentTarget.parentElement!.nextElementSibling?.classList.remove('hidden');
              }}
            />
            {/* Collapse/Expand Icon Overlay */}
            <div className={cn(
              "absolute -right-2 -bottom-2 bg-primary text-primary-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              "shadow-sm"
            )}>
              {isCollapsed ? (
                <PanelLeft className="h-3 w-3" />
              ) : (
                <PanelLeftClose className="h-3 w-3" />
              )}
            </div>
          </div>
          <span className={cn(
            "hidden bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold text-xl",
            "transition-all duration-300"
          )}>
            DSR System
          </span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
          {/* Dashboard - Always visible */}
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
              "text-muted-foreground hover:text-primary hover:bg-muted/50",
              "font-medium text-sm",
              pathname === "/dashboard" && cn(
                "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
                "text-primary border-l-4 border-blue-500 shadow-sm"
              ),
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <div className="p-1.5 rounded-md bg-blue-500/20 shadow-sm">
              <Home className={cn("h-4 w-4 text-blue-600", isCollapsed && "h-5 w-5")} />
            </div>
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          {/* Grouped Navigation */}
          {userGroups.map((group, index) => {
            const isExpanded = expandedGroups.has(group.name)
            const hasActiveItem = isGroupActive(group)
            
            return (
              <div key={group.name}>
                {/* Divider between groups */}
                {index > 0 && (
                  <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-muted/50 to-transparent" />
                )}
                <div className="mt-1">
                {/* Group Header */}
                {!isCollapsed ? (
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-all",
                      "font-semibold text-[13px] uppercase tracking-wider text-muted-foreground/70",
                      "hover:bg-muted/30 hover:text-foreground",
                      "border border-transparent hover:border-muted/50",
                      hasActiveItem && "text-foreground bg-muted/10"
                    )}
                  >
                    <div className={cn(
                      "p-0.5 rounded transition-transform duration-200",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )}>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </div>
                    <div className={cn(
                      "p-1.5 rounded-md shadow-sm",
                      group.color || "bg-gray-500",
                      "bg-opacity-25"
                    )}>
                      <group.icon className={cn(
                        "h-4 w-4",
                        group.color ? group.color.replace('bg-', 'text-') : "text-gray-500"
                      )} />
                    </div>
                    <span className="flex-1">{group.name}</span>
                    {hasActiveItem && (
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        group.color || "bg-gray-500",
                        "animate-pulse"
                      )} />
                    )}
                  </button>
                ) : (
                  <div className="flex justify-center py-2">
                    <div className={cn(
                      "p-1.5 rounded-md",
                      group.color || "bg-gray-500",
                      "bg-opacity-20"
                    )}>
                      <group.icon className={cn(
                        "h-4 w-4",
                        group.color ? group.color.replace('bg-', 'text-') : "text-gray-500"
                      )} />
                    </div>
                  </div>
                )}

                {/* Group Items - Collapsible */}
                <div className={cn(
                  "overflow-hidden transition-all duration-300",
                  !isCollapsed && isExpanded ? "max-h-96 opacity-100 mt-1" : 
                  !isCollapsed && !isExpanded ? "max-h-0 opacity-0" :
                  "max-h-96 opacity-100" // Always show items when collapsed
                )}>
                  {/* Submenu Container with Background and Border */}
                  {!isCollapsed && isExpanded && (
                    <div className="ml-3 mt-1 relative">
                      {/* Vertical Line Connector */}
                      <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-muted via-muted to-transparent" />
                      
                      {/* Submenu Items */}
                      <div className="space-y-0.5 bg-muted/20 rounded-lg p-1 border-l-2 border-muted/50 ml-2">
                        {group.items.map((item) => {
                          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm",
                                "text-muted-foreground/80 transition-all",
                                "hover:text-primary hover:bg-background/60",
                                "hover:translate-x-0.5",
                                "ml-3", // Additional indent for submenu items
                                isActive && cn(
                                  "bg-background text-primary font-medium shadow-sm",
                                  "border-l-2 -ml-[2px] pl-[14px]", // Adjust for border alignment
                                  group.color ? 
                                    group.color.replace('bg-', 'border-') : 
                                    "border-gray-500"
                                )
                              )}
                            >
                              <item.icon className={cn(
                                "h-3.5 w-3.5 opacity-70",
                                isActive && "opacity-100"
                              )} />
                              <span className="text-[13px]">{item.name}</span>
                              {item.badge && (
                                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Collapsed State Items */}
                  {isCollapsed && group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-2 text-muted-foreground transition-all",
                          "hover:text-primary hover:bg-muted/50",
                          "justify-center",
                          isActive && cn(
                            "bg-gradient-to-r text-primary font-medium",
                            group.color ? 
                              `${group.color.replace('bg-', 'from-')}/10 to-transparent` : 
                              "from-gray-500/10 to-transparent"
                          )
                        )}
                        title={item.name}
                      >
                        <item.icon className={cn(
                          "h-4 w-4",
                          isActive && (group.color ? group.color.replace('bg-', 'text-') : "text-gray-500")
                        )} />
                      </Link>
                    )
                  })}
                </div>
                </div>
              </div>
            )
          })}
        </nav>
      </div>
      
      {/* Footer */}
      <div className="border-t p-4">
        <div className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          isCollapsed && "justify-center"
        )}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {!isCollapsed && <span>System Online</span>}
        </div>
      </div>
    </div>
  )
}