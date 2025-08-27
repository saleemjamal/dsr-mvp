"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  CheckSquare
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    name: "Sales",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    name: "Sales Orders",
    href: "/orders",
    icon: Package,
  },
  {
    name: "Expenses",
    href: "/expenses", 
    icon: Receipt,
  },
  {
    name: "Hand Bills",
    href: "/hand-bills",
    icon: FileText,
  },
  {
    name: "Gift Vouchers",
    href: "/vouchers",
    icon: Gift,
  },
  {
    name: "Returns",
    href: "/returns",
    icon: RotateCcw,
  },
  {
    name: "Cash Management",
    href: "/cash-management",
    icon: Calculator,
  },
  {
    name: "Approvals",
    href: "/approvals",
    icon: CheckSquare,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    name: "Admin",
    href: "/admin",
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Menu className="h-6 w-6" />
          <span className="">DSR System</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navigation.map((item) => {
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