"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, User, LogOut, Settings as SettingsIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { 
  Home, 
  ShoppingCart, 
  Receipt, 
  Gift, 
  BarChart3,
  Settings,
  Users,
  Building,
  DollarSign,
  FileText
} from "lucide-react"
import { UserRole, Permission, hasPermission } from "@/lib/permissions"

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
    href: "/",
    icon: Home,
  },
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
  {
    name: "Gift Vouchers",
    href: "/vouchers", 
    icon: Gift,
    permission: Permission.CREATE_VOUCHER,
  },
  {
    name: "Cash Management",
    href: "/cash",
    icon: DollarSign,
    permission: Permission.COUNT_CASH,
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

export function Header() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  // Get navigation items based on user role
  const userNavigation = profile ? getFilteredNavigation(profile.role) : []

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium">
            <Link
              href="#"
              className="flex items-center gap-2 text-lg font-semibold mb-4"
            >
              <Menu className="h-6 w-6" />
              <span>DSR System</span>
            </Link>
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
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold">
          {userNavigation.find(item => item.href === pathname)?.name || "Dashboard"}
        </h1>
      </div>

      {/* User menu and theme toggle */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={profile?.full_name || user.email || ''} />
                  <AvatarFallback>
                    {getUserInitials(profile?.full_name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                  {profile?.role && (
                    <p className="text-xs leading-none text-muted-foreground capitalize">
                      Role: {profile.role}
                    </p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}