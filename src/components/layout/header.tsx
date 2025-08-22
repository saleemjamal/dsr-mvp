"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  ShoppingCart, 
  Receipt, 
  Gift, 
  BarChart3,
  Settings
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
    name: "Expenses",
    href: "/expenses", 
    icon: Receipt,
  },
  {
    name: "Gift Vouchers",
    href: "/vouchers",
    icon: Gift,
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

export function Header() {
  const pathname = usePathname()

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
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold">
          {navigation.find(item => item.href === pathname)?.name || "Dashboard"}
        </h1>
      </div>

      {/* Theme toggle */}
      <ThemeToggle />
    </header>
  )
}