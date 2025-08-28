"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, FileText, TrendingUp, Calculator, Building, Zap, Download, Eye, Loader2 } from "lucide-react"
import Link from "next/link"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission } from "@/lib/permissions"
import { useAuth } from "@/contexts/auth-context"

const reportCategories = [
  {
    title: "Financial Reports",
    description: "Revenue, expenses, and profitability analysis",
    icon: BarChart3,
    color: "bg-blue-100 text-blue-600",
    reports: [
      {
        name: "Daily Sales Summary",
        description: "Complete sales breakdown by store and payment method",
        href: "/reports/financial/daily-sales-summary",
        permissions: [Permission.VIEW_SALES]
      },
      {
        name: "Expense Report", 
        description: "Categorized expenses with approval status",
        href: "/reports/financial/expense-report",
        permissions: [Permission.VIEW_EXPENSES]
      },
      {
        name: "Profit & Loss",
        description: "Income statement with period comparisons",
        href: "/reports/financial/profit-loss",
        permissions: [Permission.VIEW_REPORTS]
      },
      {
        name: "Cash Flow Statement",
        description: "Cash inflows and outflows analysis",
        href: "/reports/financial/cash-flow",
        permissions: [Permission.VIEW_CASH_MANAGEMENT]
      }
    ]
  },
  {
    title: "Operational Reports",
    description: "Store performance and transaction monitoring",
    icon: Building,
    color: "bg-green-100 text-green-600",
    reports: [
      {
        name: "Store Performance",
        description: "Sales metrics and KPIs by location",
        href: "/reports/operational/store-performance",
        permissions: [Permission.VIEW_REPORTS]
      },
      {
        name: "Transaction Log",
        description: "Complete audit trail of all transactions",
        href: "/reports/operational/transaction-log", 
        permissions: [Permission.VIEW_REPORTS]
      },
      {
        name: "Cash Variance Report",
        description: "Daily cash counting and variance analysis",
        href: "/reports/operational/variance-report",
        permissions: [Permission.VIEW_CASH_MANAGEMENT]
      }
    ]
  },
  {
    title: "Compliance & Export",
    description: "Tax reports and external system integrations",
    icon: FileText,
    color: "bg-orange-100 text-orange-600",
    reports: [
      {
        name: "Tax Summary",
        description: "GST and tax calculations for filing",
        href: "/reports/compliance/tax-summary",
        permissions: [Permission.VIEW_REPORTS]
      },
      {
        name: "Tally Export",
        description: "Export data in Tally-compatible formats",
        href: "/reports/compliance/tally-export",
        permissions: [Permission.EXPORT_DATA],
        badge: "Popular"
      },
      {
        name: "Audit Trail",
        description: "Complete user activity and system logs",
        href: "/reports/compliance/audit-trail",
        permissions: [Permission.VIEW_REPORTS]
      }
    ]
  },
  {
    title: "Analytics & Insights",
    description: "Trends, forecasting, and business intelligence",
    icon: TrendingUp,
    color: "bg-purple-100 text-purple-600",
    reports: [
      {
        name: "Sales Trends",
        description: "Historical analysis and pattern identification",
        href: "/reports/analytics/trends",
        permissions: [Permission.VIEW_REPORTS]
      },
      {
        name: "Period Comparisons",
        description: "Month-over-month and year-over-year analysis",
        href: "/reports/analytics/comparisons",
        permissions: [Permission.VIEW_REPORTS]
      },
      {
        name: "Forecasting",
        description: "Predictive analytics for sales and expenses",
        href: "/reports/analytics/forecasts",
        permissions: [Permission.VIEW_REPORTS],
        badge: "Beta"
      }
    ]
  }
]

export default function ReportsPage() {
  const { loading, profile, user } = useAuth()

  // Debug logging
  console.log('Reports Page - Auth State:', { 
    loading, 
    hasProfile: !!profile, 
    hasUser: !!user,
    userRole: profile?.role,
    profileData: profile 
  })

  if (loading) {
    console.log('Reports Page - Showing loading state')
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading reports...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!profile) {
    console.log('Reports Page - No profile, showing no access message')
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">Unable to load user profile</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  console.log('Reports Page - Rendering with PermissionGuard')
  return (
    <PermissionGuard 
      permission={Permission.VIEW_REPORTS}
      fallback={
        <div className="flex min-h-screen">
          <aside className="hidden lg:block w-64 border-r">
            <Sidebar />
          </aside>
          
          <div className="flex-1">
            <Header />
            
            <main className="p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground">You don't have permission to view reports</p>
                  <p className="text-sm text-muted-foreground mt-2">Your role: {profile?.role}</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      }
    >
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
              <p className="text-muted-foreground">
                Comprehensive business intelligence and data export capabilities
              </p>
            </div>

            {/* Quick Actions - Streamlined */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Most commonly used reports and exports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  <Link href="/reports/compliance/tally-export">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export to Tally
                      <Badge variant="secondary" className="ml-auto text-xs">Popular</Badge>
                    </Button>
                  </Link>
                  
                  <Link href="/reports/financial/daily-sales-summary">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Calculator className="mr-2 h-4 w-4" />
                      Today's Sales Summary
                    </Button>
                  </Link>
                  
                  <Link href="/reports/operational/store-performance">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Building className="mr-2 h-4 w-4" />
                      Store Performance
                    </Button>
                  </Link>
                  
                  <Link href="/reports/operational/variance-report">
                    <Button variant="outline" className="w-full justify-start" size="sm">
                      <Zap className="mr-2 h-4 w-4" />
                      Cash Variance Report
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Report Categories - List View */}
            <div className="space-y-6">
              {reportCategories.map((category) => (
                <Card key={category.title}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${category.color}`}>
                        <category.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {category.reports.map((report) => (
                        <PermissionGuard 
                          key={report.name} 
                          permission={report.permissions[0]}
                          fallback={null}
                        >
                          <Link href={report.href}>
                            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/30 group-hover:bg-primary transition-colors" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                                      {report.name}
                                    </h4>
                                    {report.badge && (
                                      <Badge variant="secondary" className="text-xs">
                                        {report.badge}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {report.description}
                                  </p>
                                </div>
                              </div>
                              <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </Link>
                        </PermissionGuard>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </PermissionGuard>
  )
}