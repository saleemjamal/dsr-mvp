"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calculator, IndianRupee, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Plus, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { calculateExpectedCashAmount, getCashSummary, getLatestCashCount } from "@/lib/cash-service"
import { toast } from "sonner"

interface CashData {
  salesCash: {
    expected: number
    actual: number
    variance: number
    lastCounted?: string
  }
  pettyCash: {
    balance: number
    expected: number
    actual: number
    variance: number
    lastCounted?: string
    lowThreshold: number
  }
  todayTransactions: {
    cashSales: number
    cashAdvances: number
    cashTransfers: number
    deposits: number
  }
}

const mockCashHistory = [
  {
    id: "1",
    date: "2025-01-22",
    type: "sales_count",
    expected: 15000,
    actual: 15050,
    variance: 50,
    countedBy: "Manager A",
    timestamp: "08:30 AM"
  },
  {
    id: "2", 
    date: "2025-01-22",
    type: "petty_count",
    actual: 3200,
    countedBy: "Manager A",
    timestamp: "08:45 AM"
  },
  {
    id: "3",
    date: "2025-01-21", 
    type: "transfer",
    amount: 3000,
    from: "sales",
    to: "petty",
    approvedBy: "AIC",
    timestamp: "02:15 PM"
  }
]

export default function CashManagementPage() {
  const { profile } = useAuth()
  const { accessibleStores, selectedStore } = useStore()
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [cashData, setCashData] = useState<CashData | null>(null)
  const [cashHistory, setCashHistory] = useState(mockCashHistory)

  // Load cash management data when filters change
  useEffect(() => {
    if (!filters || !profile || !accessibleStores || accessibleStores.length === 0) return

    const loadCashData = async () => {
      try {
        setLoading(true)
        const date = format(filters.dateRange.to, 'yyyy-MM-dd') // Use 'to' date for counting day
        
        // Use selected store or first accessible store
        const storeId = selectedStore?.id || accessibleStores[0]?.id
        if (!storeId) {
          throw new Error('No store selected')
        }

        // Calculate expected amounts
        const salesExpected = await calculateExpectedCashAmount(storeId, 'sales_cash', date)
        const pettyExpected = await calculateExpectedCashAmount(storeId, 'petty_cash', date)

        // Get latest cash counts
        const salesCount = await getLatestCashCount(storeId, 'sales_drawer')
        const pettyCount = await getLatestCashCount(storeId, 'petty_cash')

        const salesActual = salesCount?.total_counted || 0
        const pettyActual = pettyCount?.total_counted || 0

        const newCashData: CashData = {
          salesCash: {
            expected: salesExpected,
            actual: salesActual,
            variance: salesActual - salesExpected,
            lastCounted: salesCount?.counted_at
          },
          pettyCash: {
            balance: pettyActual,
            expected: pettyExpected,
            actual: pettyActual,
            variance: pettyActual - pettyExpected,
            lastCounted: pettyCount?.counted_at,
            lowThreshold: 2000
          },
          todayTransactions: {
            cashSales: 0, // TODO: Calculate from today's transactions
            cashAdvances: 0,
            cashTransfers: 0,
            deposits: 0
          }
        }

        setCashData(newCashData)
        setCashHistory(mockCashHistory) // Keep mock history for now
      } catch (error) {
        console.error('Error loading cash management data:', error)
        toast.error('Failed to load cash management data')
      } finally {
        setLoading(false)
      }
    }

    loadCashData()
  }, [filters, profile, accessibleStores, selectedStore])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) {
      return <Badge variant="default" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Perfect</Badge>
    } else if (variance > 0) {
      return <Badge variant="secondary" className="text-orange-600"><TrendingUp className="h-3 w-3 mr-1" />+{formatCurrency(variance)}</Badge>
    } else {
      return <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />{formatCurrency(variance)}</Badge>
    }
  }

  const getCriticalVarianceAlert = (totalVariance: number) => {
    if (Math.abs(totalVariance) >= 500) {
      return <Badge variant="destructive" className="text-red-700 animate-pulse"><AlertTriangle className="h-3 w-3 mr-1" />CRITICAL: ₹{Math.abs(totalVariance)}</Badge>
    }
    return null
  }

  const isPettyCashLow = cashData ? cashData.pettyCash.balance < cashData.pettyCash.lowThreshold : false
  const totalVariance = cashData ? cashData.salesCash.variance + cashData.pettyCash.variance : 0

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cash Management</h2>
              <p className="text-muted-foreground">
                Daily cash counting, transfers, and balance management
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/cash-management/count">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Count Cash
                </Button>
              </Link>
              <Link href="/cash-management/transfers">
                <Button variant="outline">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Transfers
                </Button>
              </Link>
            </div>
          </div>

          {/* Filter Bar */}
          <FilterBar 
            onFiltersChange={handleFiltersChange} 
            showStoreFilter={true}
            showDateFilter={true}
          />

          {/* Cash Status Cards */}
          {!loading && filters && cashData && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            
            {/* Critical Variance Alert */}
            {getCriticalVarianceAlert(totalVariance) && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-800">Variance Alert</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-700">₹{Math.abs(totalVariance)}</div>
                  <p className="text-xs text-red-600 mt-2">
                    Critical variance requires immediate attention
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* Sales Cash Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Cash</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(cashData.salesCash.actual)}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Expected: {formatCurrency(cashData.salesCash.expected)}
                  </p>
                  {getVarianceBadge(cashData.salesCash.variance)}
                </div>
              </CardContent>
            </Card>

            {/* Petty Cash Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Petty Cash</CardTitle>
                <IndianRupee className={`h-4 w-4 ${isPettyCashLow ? 'text-orange-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isPettyCashLow ? 'text-orange-600' : ''}`}>
                  {formatCurrency(cashData.pettyCash.balance)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Expected: {formatCurrency(cashData.pettyCash.expected)}
                  </p>
                  {getVarianceBadge(cashData.pettyCash.variance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPettyCashLow ? (
                    <span className="text-orange-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Below ₹{cashData.pettyCash.lowThreshold.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sufficient balance
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Today's Cash Inflow */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Inflow</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(cashData.todayTransactions.cashSales + cashData.todayTransactions.cashAdvances)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sales: {formatCurrency(cashData.todayTransactions.cashSales)} + 
                  Advances: {formatCurrency(cashData.todayTransactions.cashAdvances)}
                </p>
              </CardContent>
            </Card>

            {/* Cash Transfers Today */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
                <TrendingDown className={`h-4 w-4 ${Math.abs(totalVariance) >= 500 ? 'text-red-500' : Math.abs(totalVariance) > 150 ? 'text-orange-500' : 'text-green-500'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${Math.abs(totalVariance) >= 500 ? 'text-red-600' : Math.abs(totalVariance) > 150 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(totalVariance)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.abs(totalVariance) >= 500 ? 'Critical variance - requires attention' : 
                   Math.abs(totalVariance) > 150 ? 'Warning level variance' : 
                   'Normal variance range'}
                </p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Low Cash Alert */}
          {isPettyCashLow && (
            <div className="mb-6">
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div>
                      <h4 className="font-medium text-orange-900 dark:text-orange-100">Low Petty Cash Alert</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Petty cash balance ({formatCurrency(cashData.pettyCash.balance)}) is below the threshold of {formatCurrency(cashData.pettyCash.lowThreshold)}. 
                        Consider requesting a transfer from sales cash.
                      </p>
                    </div>
                    <Link href="/cash-management/transfers">
                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600">
                        Request Transfer
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Cash Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Cash Activity</CardTitle>
                  <CardDescription>
                    Latest cash counts, transfers, and transactions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {filters?.dateRange ? 
                      `${format(filters.dateRange.from, 'MMM dd')} - ${format(filters.dateRange.to, 'MMM dd, yyyy')}` :
                      'Activity period'
                    }
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading cash management data...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCashHistory.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge variant={
                            activity.type === 'sales_count' ? 'default' :
                            activity.type === 'petty_count' ? 'secondary' : 'outline'
                          }>
                            {activity.type === 'sales_count' ? 'Sales Count' :
                             activity.type === 'petty_count' ? 'Petty Count' : 'Transfer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activity.type === 'transfer' ? (
                            <span className="capitalize">{activity.from} → {activity.to}</span>
                          ) : (
                            <span>
                              {activity.expected ? `Expected: ${formatCurrency(activity.expected)}` : 'Balance Count'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(activity.actual || activity.amount)}
                        </TableCell>
                        <TableCell>
                          {activity.variance !== undefined ? (
                            getVarianceBadge(activity.variance)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {activity.countedBy || activity.approvedBy}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {activity.timestamp}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}