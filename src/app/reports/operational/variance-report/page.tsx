"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, TrendingDown, TrendingUp, AlertCircle, DollarSign, Building, Loader2, FileSpreadsheet, FileText } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission } from "@/lib/permissions"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import { calculateExpectedCashAmount, getLatestCashCount } from "@/lib/cash-service"
import { toast } from "sonner"

interface CashVarianceData {
  storeId: string
  storeName: string
  date: string
  salesCash: {
    expected: number
    actual: number
    variance: number
    lastCounted?: string
  }
  pettyCash: {
    expected: number
    actual: number
    variance: number
    lastCounted?: string
  }
  totalVariance: number
  status: 'normal' | 'warning' | 'critical'
}

interface VarianceReportSummary {
  totalStores: number
  totalVariance: number
  averageVariance: number
  storesWithIssues: number
  worstVariance: number
  bestVariance: number
  reportDate: string
}

export default function VarianceReportPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [varianceData, setVarianceData] = useState<CashVarianceData[]>([])
  const [summary, setSummary] = useState<VarianceReportSummary>({
    totalStores: 0,
    totalVariance: 0,
    averageVariance: 0,
    storesWithIssues: 0,
    worstVariance: 0,
    bestVariance: 0,
    reportDate: ''
  })

  // Load variance data when filters change
  useEffect(() => {
    if (!filters || !profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }

    loadVarianceData()
  }, [filters, profile, accessibleStores])

  const loadVarianceData = async () => {
    try {
      setLoading(true)
      const date = format(filters!.dateRange.to, 'yyyy-MM-dd') // Use end date for variance report
      
      // Get user's accessible stores
      const userStoreIds = accessibleStores.map(store => store.id)
      
      // Determine store filter based on selection
      let storesToProcess = accessibleStores
      if (filters!.storeId !== null) {
        storesToProcess = accessibleStores.filter(store => store.id === filters!.storeId)
      }
      
      const varianceResults: CashVarianceData[] = []
      
      for (const store of storesToProcess) {
        try {
          // Calculate expected amounts
          const salesExpected = await calculateExpectedCashAmount(store.id, 'sales_cash', date)
          const pettyExpected = await calculateExpectedCashAmount(store.id, 'petty_cash', date)
          
          // Get latest cash counts
          const salesCount = await getLatestCashCount(store.id, 'sales_drawer')
          const pettyCount = await getLatestCashCount(store.id, 'petty_cash')
          
          const salesActual = salesCount?.total_counted || 0
          const pettyActual = pettyCount?.total_counted || 0
          
          const salesVariance = salesActual - salesExpected
          const pettyVariance = pettyActual - pettyExpected
          const totalVariance = salesVariance + pettyVariance
          
          // Determine status based on variance thresholds
          let status: 'normal' | 'warning' | 'critical' = 'normal'
          const absoluteTotalVariance = Math.abs(totalVariance)
          if (absoluteTotalVariance > 5000) {
            status = 'critical'
          } else if (absoluteTotalVariance > 1000) {
            status = 'warning'
          }
          
          varianceResults.push({
            storeId: store.id,
            storeName: store.store_name,
            date,
            salesCash: {
              expected: salesExpected,
              actual: salesActual,
              variance: salesVariance,
              lastCounted: salesCount?.counted_at ? format(new Date(salesCount.counted_at), 'MMM dd, HH:mm') : undefined
            },
            pettyCash: {
              expected: pettyExpected,
              actual: pettyActual,
              variance: pettyVariance,
              lastCounted: pettyCount?.counted_at ? format(new Date(pettyCount.counted_at), 'MMM dd, HH:mm') : undefined
            },
            totalVariance,
            status
          })
        } catch (storeError) {
          console.error(`Error processing store ${store.store_name}:`, storeError)
          // Continue with other stores even if one fails
        }
      }
      
      setVarianceData(varianceResults)
      
      // Calculate summary statistics
      const totalVariance = varianceResults.reduce((sum, item) => sum + item.totalVariance, 0)
      const storesWithIssues = varianceResults.filter(item => item.status !== 'normal').length
      const variances = varianceResults.map(item => item.totalVariance)
      const worstVariance = variances.length > 0 ? Math.min(...variances) : 0
      const bestVariance = variances.length > 0 ? Math.max(...variances) : 0
      
      setSummary({
        totalStores: varianceResults.length,
        totalVariance,
        averageVariance: varianceResults.length > 0 ? totalVariance / varianceResults.length : 0,
        storesWithIssues,
        worstVariance,
        bestVariance,
        reportDate: date
      })
      
    } catch (error) {
      console.error('Error loading variance data:', error)
      toast.error('Failed to load cash variance report')
    } finally {
      setLoading(false)
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

  const getVarianceColor = (variance: number) => {
    const absVariance = Math.abs(variance)
    if (absVariance > 5000) return 'text-red-600'
    if (absVariance > 1000) return 'text-orange-600'
    if (variance > 0) return 'text-green-600'
    return 'text-gray-600'
  }

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <DollarSign className="h-4 w-4 text-gray-600" />
  }

  const getStatusBadge = (status: 'normal' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Critical</Badge>
      case 'warning':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Warning</Badge>
      default:
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Normal</Badge>
    }
  }

  const exportToExcel = () => {
    toast.success('Excel export functionality coming soon!')
  }

  const exportToPDF = () => {
    toast.success('PDF export functionality coming soon!')
  }

  return (
    <PermissionGuard permission={Permission.VIEW_CASH_MANAGEMENT}>
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
                  <h2 className="text-3xl font-bold tracking-tight">Cash Variance Report</h2>
                  <p className="text-muted-foreground">
                    Daily cash counting variance analysis across all store locations
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
                <span className="ml-2">Loading cash variance report...</span>
              </div>
            ) : filters ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getVarianceColor(summary.totalVariance)}`}>
                        {formatCurrency(summary.totalVariance)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Across {summary.totalStores} store{summary.totalStores !== 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Variance</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${getVarianceColor(summary.averageVariance)}`}>
                        {formatCurrency(summary.averageVariance)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Per store average
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Stores with Issues</CardTitle>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.storesWithIssues}</div>
                      <p className="text-xs text-muted-foreground">
                        Require attention
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Report Date</CardTitle>
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {summary.reportDate ? format(new Date(summary.reportDate), 'MMM dd') : '--'}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Analysis date
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Variance Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Store-wise Variance Analysis</CardTitle>
                    <CardDescription>
                      Detailed cash variance breakdown by store and account type
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Store</TableHead>
                            <TableHead className="text-right">Sales Cash Expected</TableHead>
                            <TableHead className="text-right">Sales Cash Actual</TableHead>
                            <TableHead className="text-right">Sales Variance</TableHead>
                            <TableHead className="text-right">Petty Cash Expected</TableHead>
                            <TableHead className="text-right">Petty Cash Actual</TableHead>
                            <TableHead className="text-right">Petty Variance</TableHead>
                            <TableHead className="text-right">Total Variance</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {varianceData.map((store) => (
                            <TableRow key={store.storeId}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{store.storeName}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Last counted: {store.salesCash.lastCounted || 'Never'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(store.salesCash.expected)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(store.salesCash.actual)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`flex items-center justify-end gap-1 ${getVarianceColor(store.salesCash.variance)}`}>
                                  {getVarianceIcon(store.salesCash.variance)}
                                  <span className="font-medium">
                                    {formatCurrency(store.salesCash.variance)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(store.pettyCash.expected)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(store.pettyCash.actual)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`flex items-center justify-end gap-1 ${getVarianceColor(store.pettyCash.variance)}`}>
                                  {getVarianceIcon(store.pettyCash.variance)}
                                  <span className="font-medium">
                                    {formatCurrency(store.pettyCash.variance)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`flex items-center justify-end gap-1 ${getVarianceColor(store.totalVariance)}`}>
                                  {getVarianceIcon(store.totalVariance)}
                                  <span className="font-bold">
                                    {formatCurrency(store.totalVariance)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(store.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {varianceData.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No variance data found for the selected period and stores
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Variance Analysis Insights */}
                {varianceData.length > 0 && (
                  <div className="grid gap-6 lg:grid-cols-2 mt-8">
                    <Card>
                      <CardHeader>
                        <CardTitle>Variance Insights</CardTitle>
                        <CardDescription>Key observations from the variance analysis</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {summary.storesWithIssues > 0 && (
                            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-orange-800">
                                  {summary.storesWithIssues} store{summary.storesWithIssues !== 1 ? 's' : ''} require attention
                                </p>
                                <p className="text-xs text-orange-700">
                                  Variances exceed acceptable thresholds and should be investigated
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {Math.abs(summary.totalVariance) > 10000 && (
                            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                              <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-red-800">
                                  High total variance detected
                                </p>
                                <p className="text-xs text-red-700">
                                  Total variance of {formatCurrency(summary.totalVariance)} requires immediate review
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {summary.storesWithIssues === 0 && (
                            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-green-800">
                                  All stores within acceptable variance
                                </p>
                                <p className="text-xs text-green-700">
                                  No critical issues detected in cash management
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Variance Thresholds</CardTitle>
                        <CardDescription>Understanding variance status levels</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm font-medium">Normal</span>
                            </div>
                            <span className="text-xs text-muted-foreground">≤ ₹1,000</span>
                          </div>
                          <div className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              <span className="text-sm font-medium">Warning</span>
                            </div>
                            <span className="text-xs text-muted-foreground">₹1,001 - ₹5,000</span>
                          </div>
                          <div className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span className="text-sm font-medium">Critical</span>
                            </div>
                            <span className="text-xs text-muted-foreground">&gt; ₹5,000</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Please select a date range and filters to view the cash variance report
              </div>
            )}
          </main>
        </div>
      </div>
    </PermissionGuard>
  )
}