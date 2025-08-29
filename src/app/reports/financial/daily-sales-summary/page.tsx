"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, TrendingUp, DollarSign, CreditCard, Banknote, Building, Loader2, FileSpreadsheet, FileText } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission } from "@/lib/permissions"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import { getDashboardData } from "@/lib/dashboard-service"
import { getSalesForDateRange } from "@/lib/sales-service"
import { toast } from "sonner"

interface SalesSummaryData {
  totalSales: number
  totalTransactions: number
  averageTransaction: number
  paymentMethods: {
    [key: string]: { amount: number; count: number }
  }
  storeBreakdown: {
    [key: string]: { amount: number; count: number; storeName: string }
  }
  hourlyBreakdown: {
    [key: string]: number
  }
  topPaymentMethod: string
  transactions: any[]
}

const paymentMethodIcons = {
  cash: Banknote,
  card: CreditCard,
  upi: TrendingUp,
  default: DollarSign
}

export default function DailySalesSummaryPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [salesData, setSalesData] = useState<SalesSummaryData>({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    paymentMethods: {},
    storeBreakdown: {},
    hourlyBreakdown: {},
    topPaymentMethod: '',
    transactions: []
  })

  // Load sales data when filters change
  useEffect(() => {
    if (!filters || !profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }

    loadSalesData()
  }, [filters, profile, accessibleStores])

  const loadSalesData = async () => {
    try {
      setLoading(true)
      const fromDate = format(filters!.dateRange.from, 'yyyy-MM-dd')
      const toDate = format(filters!.dateRange.to, 'yyyy-MM-dd')
      
      // Get user's accessible stores
      const userStoreIds = accessibleStores.map(store => store.id)
      
      // Determine store filter based on selection
      let storeFilter: string[] | null = null
      if (filters!.storeId === null) {
        storeFilter = userStoreIds
      } else {
        storeFilter = [filters!.storeId]
      }
      
      // Load sales transactions
      const salesTransactions = await getSalesForDateRange(fromDate, toDate, storeFilter)
      
      if (salesTransactions) {
        const summary = processSalesData(salesTransactions)
        setSalesData(summary)
      }
      
    } catch (error) {
      console.error('Error loading sales data:', error)
      toast.error('Failed to load sales summary')
    } finally {
      setLoading(false)
    }
  }

  const processSalesData = (transactions: any[]): SalesSummaryData => {
    const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0)
    const totalTransactions = transactions.length
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0
    
    // Payment method breakdown
    const paymentMethods: { [key: string]: { amount: number; count: number } } = {}
    transactions.forEach(t => {
      const method = t.tender_type || 'cash'
      if (!paymentMethods[method]) {
        paymentMethods[method] = { amount: 0, count: 0 }
      }
      paymentMethods[method].amount += t.amount
      paymentMethods[method].count += 1
    })
    
    // Store breakdown
    const storeBreakdown: { [key: string]: { amount: number; count: number; storeName: string } } = {}
    transactions.forEach(t => {
      const storeId = t.store_id
      const storeName = t.stores?.store_name || 'Unknown Store'
      if (!storeBreakdown[storeId]) {
        storeBreakdown[storeId] = { amount: 0, count: 0, storeName }
      }
      storeBreakdown[storeId].amount += t.amount
      storeBreakdown[storeId].count += 1
    })
    
    // Hourly breakdown (simplified - just showing distribution)
    const hourlyBreakdown: { [key: string]: number } = {}
    transactions.forEach(t => {
      const hour = new Date(t.created_at).getHours()
      const hourKey = `${hour}:00`
      hourlyBreakdown[hourKey] = (hourlyBreakdown[hourKey] || 0) + t.amount
    })
    
    // Find top payment method
    const topPaymentMethod = Object.entries(paymentMethods)
      .sort(([,a], [,b]) => b.amount - a.amount)[0]?.[0] || 'cash'
    
    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      paymentMethods,
      storeBreakdown,
      hourlyBreakdown,
      topPaymentMethod,
      transactions: transactions.slice(0, 10) // Latest 10 for preview
    }
  }

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const exportToExcel = () => {
    // Placeholder for Excel export
    toast.success('Excel export functionality coming soon!')
  }

  const exportToPDF = () => {
    // Placeholder for PDF export
    toast.success('PDF export functionality coming soon!')
  }

  const getPaymentMethodIcon = (method: string) => {
    const IconComponent = paymentMethodIcons[method as keyof typeof paymentMethodIcons] || paymentMethodIcons.default
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <PermissionGuard permission={Permission.VIEW_SALES}>
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link href="/reports">
                  <Button variant="outline" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Daily Sales Summary</h2>
                  <p className="text-muted-foreground">
                    Comprehensive sales breakdown by store, payment method, and time
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportToExcel} disabled={loading}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
                <Button variant="outline" onClick={exportToPDF} disabled={loading}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <FilterBar 
              onFiltersChange={handleFiltersChange} 
              showStoreFilter={true}
              showDateFilter={true}
            />

            {/* Summary Cards */}
            {loading && filters ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading sales summary...</span>
              </div>
            ) : filters ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(salesData.totalSales)}</div>
                      <p className="text-xs text-muted-foreground">
                        {filters.dateRange.preset || 'Selected period'}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{salesData.totalTransactions}</div>
                      <p className="text-xs text-muted-foreground">
                        Total transaction count
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(salesData.averageTransaction)}</div>
                      <p className="text-xs text-muted-foreground">
                        Per transaction average
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Payment Method</CardTitle>
                      {getPaymentMethodIcon(salesData.topPaymentMethod)}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold capitalize">{salesData.topPaymentMethod || 'Cash'}</div>
                      <p className="text-xs text-muted-foreground">
                        Most used payment method
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Breakdowns */}
                <div className="grid gap-6 lg:grid-cols-2 mb-8">
                  
                  {/* Payment Method Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Method Breakdown</CardTitle>
                      <CardDescription>Sales distribution by payment type</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(salesData.paymentMethods).map(([method, data]) => (
                          <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              {getPaymentMethodIcon(method)}
                              <div>
                                <p className="font-medium capitalize">{method.replace('_', ' ')}</p>
                                <p className="text-sm text-muted-foreground">{data.count} transactions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(data.amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                {((data.amount / salesData.totalSales) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Store Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Store Performance</CardTitle>
                      <CardDescription>Sales distribution by location</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(salesData.storeBreakdown).map(([storeId, data]) => (
                          <div key={storeId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{data.storeName}</p>
                                <p className="text-sm text-muted-foreground">{data.count} transactions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(data.amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                {((data.amount / salesData.totalSales) * 100).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>
                      Latest sales transactions for the selected period (showing top 10)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Payment Method</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(transaction.created_at), 'HH:mm')}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                  <span>{transaction.stores?.store_name || 'Unknown Store'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getPaymentMethodIcon(transaction.tender_type)}
                                  <span className="capitalize">
                                    {transaction.tender_type?.replace('_', ' ') || 'Cash'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(transaction.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="default" className="text-green-600">
                                  Completed
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {salesData.transactions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No transactions found for the selected period
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Please select a date range and filters to view the sales summary
              </div>
            )}
          </main>
        </div>
      </div>
    </PermissionGuard>
  )
}