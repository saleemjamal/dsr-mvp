"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Receipt, ExternalLink, Image, Edit, IndianRupee } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { getExpensesForUser, getExpensesForDateRange, updateExpense, getActiveExpenseCategories } from "@/lib/expense-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { toast } from "sonner"

interface ExpenseWithStore {
  id: string
  store_id: string
  expense_date: string
  category: string
  amount: number
  description: string
  voucher_image_url: string | null
  created_at: string
  stores: {
    store_name: string
    store_code: string
  }
}

const getCategoryColor = (category: string) => {
  const colors = {
    "Staff Welfare": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "Logistics": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    "Utilities": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    "Miscellaneous": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  } as const
  
  return colors[category as keyof typeof colors] || colors["Miscellaneous"]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export default function ExpensesPage() {
  const { profile } = useAuth()
  const { accessibleStores, isAllStoresSelected } = useStore()
  const [expenses, setExpenses] = useState<ExpenseWithStore[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState | null>(null)
  
  // Edit expense state
  const [editingExpense, setEditingExpense] = useState<ExpenseWithStore | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [editFormData, setEditFormData] = useState({
    amount: '',
    category: '',
    description: ''
  })

  // Initialize default filters on mount  
  useEffect(() => {
    if (!filters) {
      // Set default to "Today" if no filters set yet
      const today = new Date()
      setFilters({
        dateRange: {
          from: today,
          to: today,
          preset: 'Today'
        },
        storeIds: [], // Will be set by FilterBar based on user permissions
        storeId: null // All stores by default
      })
    }
  }, [filters])

  // Load expenses data when filters change
  useEffect(() => {
    if (!filters || !profile || !accessibleStores || accessibleStores.length === 0) return

    const loadExpensesData = async () => {
      try {
        setLoading(true)
        const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
        
        const userStoreIds = accessibleStores.map(store => store.id)
        
        // Determine store filter based on user selection and permissions
        let storeFilter: string[] | null = null
        
        if (filters.storeId === null) {
          // "All Stores" selected - use user's accessible stores
          storeFilter = userStoreIds
        } else {
          // Specific store selected - filter by that store only
          storeFilter = [filters.storeId]
        }
        
        const expensesData = await getExpensesForDateRange(
          fromDate, 
          toDate, 
          storeFilter
        )
        
        setExpenses(expensesData)
      } catch (error) {
        console.error('Error loading expenses:', error)
        toast.error('Failed to load expenses data')
      } finally {
        setLoading(false)
      }
    }

    loadExpensesData()
  }, [filters, profile, accessibleStores])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  // Load expense categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getActiveExpenseCategories()
        setCategories(data)
      } catch (error) {
        console.error('Error loading expense categories:', error)
      }
    }
    
    loadCategories()
  }, [])

  const handleEditExpense = (expense: ExpenseWithStore) => {
    setEditingExpense(expense)
    setEditFormData({
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || ''
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    setEditLoading(true)
    try {
      const amount = parseFloat(editFormData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      await updateExpense(editingExpense.id, {
        amount,
        category: editFormData.category,
        description: editFormData.description
      })

      // Update local state
      setExpenses(prev => prev.map(expense => 
        expense.id === editingExpense.id 
          ? { 
              ...expense, 
              amount, 
              category: editFormData.category, 
              description: editFormData.description 
            }
          : expense
      ))

      toast.success('Expense updated successfully!')
      setEditingExpense(null)
      setEditFormData({ amount: '', category: '', description: '' })
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Failed to update expense. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditCancel = () => {
    setEditingExpense(null)
    setEditFormData({ amount: '', category: '', description: '' })
  }

  const getTotalAmount = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0)
  }

  const getTotalCount = () => {
    return expenses.length
  }

  const getAverageAmount = () => {
    return expenses.length > 0 ? getTotalAmount() / expenses.length : 0
  }

  const getCategorySummary = () => {
    const categories = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)
    return Object.keys(categories).length
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
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
              <p className="text-muted-foreground">
                Track and manage business expenses
              </p>
            </div>
            <Link href="/expenses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </Link>
          </div>

          {/* Filter Bar */}
          <FilterBar onFiltersChange={handleFiltersChange} />

          {/* Summary Cards */}
          {!loading && filters && (
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(getTotalAmount())}</div>
                  <p className="text-xs text-muted-foreground">
                    {getTotalCount()} transaction{getTotalCount() !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(getAverageAmount())}</div>
                  <p className="text-xs text-muted-foreground">
                    Per transaction
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getCategorySummary()}</div>
                  <p className="text-xs text-muted-foreground">
                    Unique categories
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {format(filters.dateRange.from, 'MMM dd')} - {format(filters.dateRange.to, 'MMM dd, yyyy')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filters.dateRange.preset || 'Custom range'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Expense Transactions</CardTitle>
              <CardDescription>
                {filters?.storeName ? `Expenses from ${filters.storeName}` : 'Expenses from all accessible stores'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading expenses...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Voucher</TableHead>
                          <TableHead className="min-w-[100px]">Date</TableHead>
                          <TableHead className="min-w-[120px]">Store</TableHead>
                          <TableHead className="min-w-[100px]">Amount</TableHead>
                          <TableHead className="min-w-[120px]">Category</TableHead>
                          <TableHead className="min-w-[200px]">Description</TableHead>
                          <TableHead className="min-w-[100px]">Time</TableHead>
                          <TableHead className="min-w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              {expense.voucher_image_url ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <button className="relative group cursor-pointer">
                                      <img 
                                        src={expense.voucher_image_url} 
                                        alt={`Voucher for ${expense.category}`}
                                        className="w-16 h-16 object-cover rounded border hover:border-primary transition-colors"
                                      />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                        <ExternalLink className="h-4 w-4 text-white" />
                                      </div>
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                      <DialogTitle>Expense Voucher - {expense.category}</DialogTitle>
                                      <DialogDescription>
                                        Voucher from {new Date(expense.expense_date).toLocaleDateString('en-IN')} - Amount: {formatCurrency(expense.amount)}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-4">
                                      <img 
                                        src={expense.voucher_image_url} 
                                        alt={`Voucher for ${expense.category}`}
                                        className="w-full h-auto rounded border"
                                      />
                                      <div className="mt-4 p-3 bg-muted rounded">
                                        <p className="text-sm font-medium">Description:</p>
                                        <p className="text-sm text-muted-foreground">{expense.description || 'No description provided'}</p>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-gray-700">
                                  <Receipt className="h-5 w-5 text-gray-400 mb-0.5" />
                                  <span className="text-[9px] text-gray-400">No voucher</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{expense.stores.store_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {expense.stores.store_code}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-red-600">
                              -{formatCurrency(expense.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getCategoryColor(expense.category)}>
                                {expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {expense.description || '-'}
                            </TableCell>
                            <TableCell>
                              {new Date(expense.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </TableCell>
                            <TableCell>
                              {canEditTransaction(expense.status || 'pending', profile?.role || 'cashier') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditExpense(expense)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {expenses.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No expenses found for the selected period.</p>
                      <Link href="/expenses/new">
                        <Button className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Expense
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="block lg:hidden mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading expenses...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {expenses.map((expense) => (
                  <Card key={expense.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{expense.stores.store_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {expense.stores.store_code}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <Badge className={getCategoryColor(expense.category)}>
                          {expense.category}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-bold text-red-600">
                          -{formatCurrency(expense.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(expense.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-muted-foreground">
                          {expense.description}
                        </p>
                      )}
                      
                      {canEditTransaction(expense.status || 'pending', profile?.role || 'cashier') && (
                        <div className="flex justify-end mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {expenses.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No expenses found for the selected period.</p>
                    <Link href="/expenses/new">
                      <Button className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Expense
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit Expense Dialog */}
          <Dialog open={!!editingExpense} onOpenChange={(open) => !open && handleEditCancel()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
                <DialogDescription>
                  Update the expense transaction details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_amount">Amount (₹) *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_category">Category *</Label>
                  <Select 
                    value={editFormData.category} 
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_description">Description *</Label>
                  <Textarea
                    id="edit_description"
                    placeholder="Describe the expense..."
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[80px]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleEditCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editLoading}>
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  )
}