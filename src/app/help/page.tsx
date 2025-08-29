"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  Home,
  ShoppingCart,
  DollarSign,
  Users,
  FileText,
  Gift,
  RotateCcw,
  Calculator,
  Package,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Printer
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { UserRole } from "@/lib/permissions"

// Import role-specific help content
import { StoreManagerHelp } from "@/components/help/store-manager-help"
import { CashierHelp } from "@/components/help/cashier-help"
import { SuperUserHelp } from "@/components/help/super-user-help"
import { AccountsInchargeHelp } from "@/components/help/accounts-incharge-help"

export default function HelpPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSection, setActiveSection] = useState("overview")

  // Determine which help content to show based on role
  const getHelpComponent = (roleOverride?: UserRole) => {
    if (!profile) return null

    const targetRole = roleOverride || profile.role

    switch (targetRole) {
      case UserRole.SUPER_USER:
        return <SuperUserHelp searchQuery={searchQuery} activeSection={activeSection} />
      case UserRole.ACCOUNTS_INCHARGE:
        return <AccountsInchargeHelp searchQuery={searchQuery} activeSection={activeSection} />
      case UserRole.STORE_MANAGER:
        return <StoreManagerHelp searchQuery={searchQuery} activeSection={activeSection} />
      case UserRole.CASHIER:
        return <CashierHelp searchQuery={searchQuery} activeSection={activeSection} />
      default:
        return <CashierHelp searchQuery={searchQuery} activeSection={activeSection} />
    }
  }

  const getRoleTitle = () => {
    if (!profile) return "Help Documentation"
    
    switch (profile.role) {
      case UserRole.SUPER_USER:
        return "Super User Guide"
      case UserRole.ACCOUNTS_INCHARGE:
        return "Accounts Incharge Guide"
      case UserRole.STORE_MANAGER:
        return "Store Manager Guide"
      case UserRole.CASHIER:
        return "Cashier Guide"
      default:
        return "Help Documentation"
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r print:hidden">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <div className="print:hidden">
          <Header />
        </div>
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8 print:mb-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 print:hidden">
                <Home className="h-4 w-4" />
                <ChevronRight className="h-4 w-4" />
                <span>Help & Documentation</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">{getRoleTitle()}</h2>
              <p className="text-muted-foreground">
                Complete guide for {profile?.role?.replace('_', ' ').toLowerCase()} operations
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="icon" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <Card className="mb-6 print:hidden">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search help documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Access Cards */}
          {!searchQuery && (
            <div className="grid gap-4 md:grid-cols-4 mb-8 print:hidden">
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveSection('daily-ops')}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-500" />
                    Daily Operations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Opening procedures, cash counting, reconciliation
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveSection('transactions')}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-green-500" />
                    Transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Sales, orders, returns, vouchers
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveSection('cash-mgmt')}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                    Cash Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Transfers, adjustments, deposits
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveSection('guidelines')}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Guidelines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Rules, best practices, troubleshooting
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Help Content */}
          {profile?.role === UserRole.SUPER_USER ? (
            <Tabs defaultValue="super_user" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="super_user">Super User</TabsTrigger>
                <TabsTrigger value="accounts_incharge">AIC</TabsTrigger>
                <TabsTrigger value="store_manager">Store Manager</TabsTrigger>
                <TabsTrigger value="cashier">Cashier</TabsTrigger>
              </TabsList>
              
              <Card>
                <CardContent className="pt-6">
                  <TabsContent value="super_user" className="mt-0">
                    {getHelpComponent(UserRole.SUPER_USER)}
                  </TabsContent>
                  <TabsContent value="accounts_incharge" className="mt-0">
                    {getHelpComponent(UserRole.ACCOUNTS_INCHARGE)}
                  </TabsContent>
                  <TabsContent value="store_manager" className="mt-0">
                    {getHelpComponent(UserRole.STORE_MANAGER)}
                  </TabsContent>
                  <TabsContent value="cashier" className="mt-0">
                    {getHelpComponent(UserRole.CASHIER)}
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="pt-6">
                {getHelpComponent()}
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-muted-foreground print:hidden">
            <p>Need additional help? Contact your supervisor or system administrator.</p>
          </div>
        </main>
      </div>
    </div>
  )
}