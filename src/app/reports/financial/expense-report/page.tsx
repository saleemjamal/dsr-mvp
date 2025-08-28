"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, TrendingDown, TrendingUp, DollarSign, Building, Loader2, FileSpreadsheet, FileText, Receipt, PieChart } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission } from "@/lib/permissions"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { getExpensesForDateRange, getActiveExpenseCategories, type ExpenseCategory } from "@/lib/expense-service"
import { toast } from "sonner"

interface ExpenseWithStore {
  id?: string
  store_id: string
  expense_date: string
  category: string
  amount: number
  description: string
  voucher_image_url?: string
  created_at?: string
  stores: {
    store_name: string
  }
}

interface ExpenseCategoryAnalysis {
  category: string
  totalAmount: number
  transactionCount: number
  percentage: number
  averageAmount: number
  topStore?: string
  trend: 'up' | 'down' | 'stable'
}

interface ExpenseReportSummary {
  totalExpenses: number
  totalTransactions: number
  averageExpense: number
  topCategory: string
  topCategoryAmount: number
  storeCount: number
  dateRange: string
}

interface StoreExpenseAnalysis {
  storeId: string
  storeName: string
  totalAmount: number
  transactionCount: number
  averageExpense: number
  topCategory: string
  topCategoryAmount: number
}

export default function ExpenseReportPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [expenses, setExpenses] = useState<ExpenseWithStore[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [summary, setSummary] = useState<ExpenseReportSummary>({
    totalExpenses: 0,
    totalTransactions: 0,
    averageExpense: 0,
    topCategory: '',
    topCategoryAmount: 0,
    storeCount: 0,
    dateRange: ''
  })
  const [categoryAnalysis, setCategoryAnalysis] = useState<ExpenseCategoryAnalysis[]>([])
  const [storeAnalysis, setStoreAnalysis] = useState<StoreExpenseAnalysis[]>([])

  // Load expense categories
  useEffect(() => {
    loadExpenseCategories()
  }, [])

  // Load expense data when filters change
  useEffect(() => {
    if (!filters || !profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }

    loadExpenseData()
  }, [filters, profile, accessibleStores])

  const loadExpenseCategories = async () => {
    try {
      const categoriesData = await getActiveExpenseCategories()
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading expense categories:', error)
    }
  }

  const loadExpenseData = async () => {
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
      
      // Load expense data
      const expensesData = await getExpensesForDateRange(fromDate, toDate, storeFilter)
      setExpenses(expensesData || [])
      
      if (expensesData) {
        // Calculate summary
        const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0)
        const totalTransactions = expensesData.length
        const averageExpense = totalTransactions > 0 ? totalExpenses / totalTransactions : 0
        
        // Get unique stores
        const uniqueStores = new Set(expensesData.map(expense => expense.store_id))
        
        // Find top category
        const categoryTotals = expensesData.reduce((acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount
          return acc
        }, {} as { [key: string]: number })
        
        const topCategoryEntry = Object.entries(categoryTotals)
          .sort(([,a], [,b]) => b - a)[0]
        
        setSummary({
          totalExpenses,
          totalTransactions,
          averageExpense,
          topCategory: topCategoryEntry?.[0] || '',
          topCategoryAmount: topCategoryEntry?.[1] || 0,
          storeCount: uniqueStores.size,
          dateRange: `${format(filters!.dateRange.from, 'MMM dd')} - ${format(filters!.dateRange.to, 'MMM dd')}`
        })
        
        // Calculate category analysis
        const categoryAnalysisData = Object.entries(categoryTotals).map(([category, amount]) => {
          const categoryExpenses = expensesData.filter(expense => expense.category === category)
          const transactionCount = categoryExpenses.length
          const percentage = (amount / totalExpenses) * 100
          const averageAmount = amount / transactionCount
          
          // Find top store for this category
          const storeTotals = categoryExpenses.reduce((acc, expense) => {
            const storeName = expense.stores?.store_name || 'Unknown Store'
            acc[storeName] = (acc[storeName] || 0) + expense.amount
            return acc
          }, {} as { [key: string]: number })
          
          const topStore = Object.entries(storeTotals)
            .sort(([,a], [,b]) => b - a)[0]?.[0]
          
          return {
            category,
            totalAmount: amount,
            transactionCount,
            percentage,
            averageAmount,
            topStore,
            trend: 'stable' as 'up' | 'down' | 'stable' // TODO: Calculate based on historical data
          }
        }).sort((a, b) => b.totalAmount - a.totalAmount)
        
        setCategoryAnalysis(categoryAnalysisData)
        
        // Calculate store analysis
        const storeGroups = expensesData.reduce((acc, expense) => {
          const storeId = expense.store_id
          if (!acc[storeId]) {
            acc[storeId] = []
          }
          acc[storeId].push(expense)
          return acc
        }, {} as { [key: string]: ExpenseWithStore[] })
        
        const storeAnalysisData = Object.entries(storeGroups).map(([storeId, storeExpenses]) => {
          const storeName = storeExpenses[0]?.stores?.store_name || 'Unknown Store'
          const totalAmount = storeExpenses.reduce((sum, expense) => sum + expense.amount, 0)
          const transactionCount = storeExpenses.length
          const averageExpense = totalAmount / transactionCount
          
          // Find top category for this store
          const storeCategoryTotals = storeExpenses.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount
            return acc
          }, {} as { [key: string]: number })
          
          const topCategoryEntry = Object.entries(storeCategoryTotals)
            .sort(([,a], [,b]) => b - a)[0]
          
          return {
            storeId,
            storeName,
            totalAmount,
            transactionCount,
            averageExpense,
            topCategory: topCategoryEntry?.[0] || '',
            topCategoryAmount: topCategoryEntry?.[1] || 0
          }
        }).sort((a, b) => b.totalAmount - a.totalAmount)
        
        setStoreAnalysis(storeAnalysisData)
      }
      
    } catch (error) {
      console.error('Error loading expense data:', error)
      toast.error('Failed to load expense report')
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

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const exportToExcel = () => {
    toast.success('Excel export functionality coming soon!')
  }

  const exportToPDF = () => {
    toast.success('PDF export functionality coming soon!')
  }

  return (
    <PermissionGuard permission={Permission.VIEW_EXPENSES}>
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
                  <h2 className="text-3xl font-bold tracking-tight">Expense Report</h2>
                  <p className="text-muted-foreground">
                    Comprehensive expense analysis with category breakdown and store performance
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
                <span className="ml-2">Loading expense report...</span>
              </div>
            ) : filters ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(summary.totalExpenses)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {summary.dateRange}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{summary.totalTransactions}</div>
                      <p className="text-xs text-muted-foreground">
                        Expense transactions
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Expense</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.averageExpense)}</div>
                      <p className="text-xs text-muted-foreground">
                        Per transaction average
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Top Category</CardTitle>
                      <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-sm">{summary.topCategory || 'None'}</div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(summary.topCategoryAmount)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Analysis */}
                <div className="grid gap-6 lg:grid-cols-2 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Breakdown</CardTitle>
                      <CardDescription>Expense analysis by category</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {categoryAnalysis.map((category) => (
                          <div key={category.category} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <div>
                                <p className="font-medium">{category.category}</p>
                                <p className="text-sm text-muted-foreground">
                                  {category.transactionCount} transactions • Avg: {formatCurrency(category.averageAmount)}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(category.totalAmount)}</p>
                              <p className="text-sm text-muted-foreground">
                                {category.percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {categoryAnalysis.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No expense categories found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Store Performance</CardTitle>
                      <CardDescription>Expense analysis by store location</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {storeAnalysis.map((store) => (
                          <div key={store.storeId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{store.storeName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Top: {store.topCategory}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(store.totalAmount)}</p>
                              <p className="text-sm text-muted-foreground">
                                {store.transactionCount} transactions
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {storeAnalysis.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No store data found
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Transactions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Expense Transactions</CardTitle>
                    <CardDescription>
                      Latest expense transactions for the selected period (showing top 20)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Voucher</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expenses.slice(0, 20).map((expense) => (
                            <TableRow key={expense.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {expense.created_at ? format(new Date(expense.created_at), 'HH:mm') : '--:--'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                  <span>{expense.stores?.store_name || 'Unknown Store'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {expense.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  <p className="text-sm truncate" title={expense.description}>
                                    {expense.description}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium text-red-600">
                                {formatCurrency(expense.amount)}
                              </TableCell>
                              <TableCell>
                                {expense.voucher_image_url ? (
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    Available
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    None
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {expenses.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No expense transactions found for the selected period
                      </div>
                    )}
                    
                    {expenses.length > 20 && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Showing 20 of {expenses.length} transactions
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Please select a date range and filters to view the expense report
              </div>
            )}
          </main>
        </div>
      </div>
    </PermissionGuard>
  )
}