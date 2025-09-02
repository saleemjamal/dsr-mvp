"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getUserProfile, type UserProfile } from "@/lib/user-service"
import { useStore } from "@/contexts/store-context"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, AlertTriangle, Gift, Loader2, Calculator, Receipt, ArrowUpDown, Users, Banknote } from "lucide-react"
import { format } from "date-fns"
import { getDashboardData, type DashboardData } from "@/lib/dashboard-service"
import { toast } from "sonner"
import Link from "next/link"

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const { accessibleStores } = useStore()
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: new Date(),
      to: new Date(),
      preset: 'Today'
    },
    storeIds: [],
    storeId: null
  })
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalSales: 0,
    totalExpenses: 0,
    totalHandBills: 0,
    totalReturns: 0,
    salesCashBalance: 0,
    pettyCashBalance: 0,
    pendingDepositAmount: 0,
    todayExpenses: 0,
    cashVariance: 0,
    salesCashExpected: 0,
    salesCashActual: 0,
    pettyCashExpected: 0,
    pettyCashActual: 0,
    activeVouchers: 0,
    vouchersOutstanding: 0,
    recentSales: [],
    recentExpenses: [],
    totalTransactions: 0,
    averageTransactionValue: 0,
    pendingApprovals: 0,
    lowCashAlert: false
  })

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      setUser(session.user)

      // Simple profile lookup by user ID
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
      
      if (!profiles || profiles.length === 0) {
        console.error('User profile not found')
        router.push('/auth/login?error=user_not_found')
        return
      }

      setProfile(profiles[0] as UserProfile)
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load dashboard data when filters change
  useEffect(() => {
    if (!profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }

    const loadDashboardData = async () => {
      try {
        console.log('Dashboard - Starting data load...')
        setDashboardLoading(true)
        const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
        
        // Get user's accessible stores
        const userStoreIds = accessibleStores.map(store => store.id)
        
        // Determine store filter based on selection
        let storeFilter: string[] | null = null
        if (filters.storeId === null) {
          // "All Stores" selected - use user's accessible stores
          storeFilter = userStoreIds
        } else {
          // Specific store selected
          storeFilter = [filters.storeId]
        }
        
        console.log('Dashboard loading data:', { fromDate, toDate, storeFilter, accessibleStores })
        console.log('Dashboard - About to call getDashboardData...')
        
        // Load all dashboard data using the new service
        const data = await getDashboardData({
          dateFrom: fromDate,
          dateTo: toDate,
          storeIds: storeFilter
        })
        
        console.log('Dashboard - getDashboardData completed:', data)
        setDashboardData(data)
        console.log('Dashboard - State updated, data loaded successfully')
        
      } catch (error) {
        console.error('Dashboard - Error loading data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        console.log('Dashboard - Setting loading to false')
        setDashboardLoading(false)
      }
    }

    loadDashboardData()
  }, [filters, profile, accessibleStores])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      {/* Main Content */}
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome to DSR Simplified - Your daily sales reporting system
            </p>
          </div>

          {/* Filter Bar */}
          <FilterBar 
            onFiltersChange={handleFiltersChange} 
            showStoreFilter={true}
            showDateFilter={true}
          />

          {/* Metrics Cards */}
          {dashboardLoading && filters ? (
            <div className="flex items-center justify-center py-8 mb-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading dashboard data...</span>
            </div>
          ) : (
          <>
            {/* Primary Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="gradient-info dark:gradient-subtle-blue h-2"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(dashboardData.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filters.dateRange.preset || 'Custom period'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="gradient-warning dark:gradient-subtle h-2"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                  <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(dashboardData.totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground">
                    {filters.dateRange.preset || 'Custom period'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="gradient-info dark:gradient-subtle-blue h-2"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sales Cash</CardTitle>
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {formatCurrency(dashboardData.salesCashBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.pendingDepositAmount > 0 
                      ? `Pending deposit: ${formatCurrency(dashboardData.pendingDepositAmount)}`
                      : 'Customer transactions'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className={`overflow-hidden border-0 shadow-lg ${dashboardData.pettyCashBalance < 500 ? 'dark:glow-danger' : dashboardData.pettyCashBalance < 2000 ? 'dark:glow-warning' : ''}`}>
                <div className={`h-2 ${dashboardData.pettyCashBalance < 500 ? 'bg-gradient-to-r from-red-500 to-red-600' : dashboardData.pettyCashBalance < 2000 ? 'gradient-warning' : 'gradient-success'}`}></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Petty Cash</CardTitle>
                  <div className={`rounded-full p-2 ${dashboardData.pettyCashBalance < 500 ? 'bg-red-100 dark:bg-red-900/30' : dashboardData.pettyCashBalance < 2000 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    <Banknote className={`h-4 w-4 ${dashboardData.pettyCashBalance < 500 ? 'text-red-600' : dashboardData.pettyCashBalance < 2000 ? 'text-orange-600' : 'text-green-600'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${dashboardData.pettyCashBalance < 500 ? 'text-red-700 dark:text-red-400' : dashboardData.pettyCashBalance < 2000 ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                    {formatCurrency(dashboardData.pettyCashBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData.pettyCashBalance < 500 
                      ? 'Critical - Request transfer urgently'
                      : dashboardData.pettyCashBalance < 2000 
                      ? 'Low - Request transfer soon'
                      : dashboardData.todayExpenses > 0
                      ? `Today's expenses: ${formatCurrency(dashboardData.todayExpenses)}`
                      : 'Expense funds'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-transparent">
                  <CardTitle className="text-sm font-medium">Hand Bills</CardTitle>
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2">
                    <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(dashboardData.totalHandBills)}</div>
                  <p className="text-xs text-muted-foreground">
                    Credit transactions
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-transparent">
                  <CardTitle className="text-sm font-medium">Returns</CardTitle>
                  <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-2">
                    <ArrowUpDown className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(dashboardData.totalReturns)}</div>
                  <p className="text-xs text-muted-foreground">
                    Returned transactions
                  </p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-transparent">
                  <CardTitle className="text-sm font-medium">Active Vouchers</CardTitle>
                  <div className="rounded-full bg-pink-100 dark:bg-pink-900/30 p-2">
                    <Gift className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-pink-700 dark:text-pink-400">{dashboardData.activeVouchers}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(dashboardData.vouchersOutstanding)} outstanding
                  </p>
                </CardContent>
              </Card>

              <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow ${Math.abs(dashboardData.cashVariance) >= 500 ? 'border-red-200 dark:border-red-800' : ''}`}>
                <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-br ${Math.abs(dashboardData.cashVariance) >= 500 ? 'from-red-50 to-white dark:from-red-900/20' : Math.abs(dashboardData.cashVariance) > 150 ? 'from-orange-50 to-white dark:from-orange-900/20' : 'from-green-50 to-white dark:from-green-900/20'} dark:to-transparent`}>
                  <CardTitle className="text-sm font-medium">Cash Variance</CardTitle>
                  <div className={`rounded-full p-2 ${Math.abs(dashboardData.cashVariance) >= 500 ? 'bg-red-100 dark:bg-red-900/30' : Math.abs(dashboardData.cashVariance) > 150 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    <Calculator className={`h-4 w-4 ${Math.abs(dashboardData.cashVariance) >= 500 ? 'text-red-600 dark:text-red-400' : Math.abs(dashboardData.cashVariance) > 150 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${Math.abs(dashboardData.cashVariance) >= 500 ? 'text-red-700 dark:text-red-400' : Math.abs(dashboardData.cashVariance) > 150 ? 'text-orange-700 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                    {formatCurrency(dashboardData.cashVariance)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.abs(dashboardData.cashVariance) >= 500 ? 'Critical - Investigate immediately' : 
                     Math.abs(dashboardData.cashVariance) > 150 ? 'Warning - Review counts' : 
                     'Within acceptable range'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
          )}

          {/* Recent Activity */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Sales</CardTitle>
                <CardDescription>
                  {`Latest transactions from ${format(filters.dateRange.from, 'MMM dd')} - ${format(filters.dateRange.to, 'MMM dd, yyyy')}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="ml-2 text-sm">Loading recent sales...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.recentSales.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No sales found for the selected period</p>
                      </div>
                    ) : (
                      dashboardData.recentSales.map((sale, index) => (
                        <div key={sale.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              index === 0 ? 'bg-green-500' : 
                              index === 1 ? 'bg-blue-500' : 
                              index === 2 ? 'bg-orange-500' :
                              index === 3 ? 'bg-purple-500' : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <p className="text-sm font-medium">{sale.stores?.store_name || 'Unknown Store'}</p>
                              <p className="text-xs text-muted-foreground">
                                {sale.tender_type?.replace('_', ' ')?.toUpperCase()} payment
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(sale.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sale.created_at), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/sales/new">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium">Record Sale</p>
                        <p className="text-xs text-muted-foreground">Add new transaction</p>
                      </div>
                      <Badge variant="outline">Quick</Badge>
                    </div>
                  </Link>
                  
                  <Link href="/expenses">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium">Add Expense</p>
                        <p className="text-xs text-muted-foreground">Track spending</p>
                      </div>
                      <Badge variant="outline">Quick</Badge>
                    </div>
                  </Link>
                  
                  <Link href="/cash-management">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium">Count Cash</p>
                        <p className="text-xs text-muted-foreground">Daily cash counting</p>
                      </div>
                      <Badge variant="outline">Cash</Badge>
                    </div>
                  </Link>
                  
                  <Link href="/approvals">
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div>
                        <p className="text-sm font-medium">Pending Approvals</p>
                        <p className="text-xs text-muted-foreground">Review & approve</p>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {dashboardData.pendingApprovals}
                      </Badge>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}