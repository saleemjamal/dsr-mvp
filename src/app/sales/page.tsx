"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { TenderTypeSelect } from "@/components/ui/tender-type-select"
import { Plus, Loader2, Eye, Edit, CheckCircle, IndianRupee } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import { getSalesForUser, getSalesForDateRange, updateSale } from "@/lib/sales-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { toast } from "sonner"

interface SaleWithStore {
  id?: string
  store_id: string
  sale_date: string
  tender_type: string
  amount: number
  notes?: string
  status?: string
  created_at?: string
  stores: {
    store_name: string
    store_code: string
  }
}

const getTenderTypeBadge = (type: string) => {
  // Return custom badge with transaction-specific colors
  const badgeStyles = {
    cash: "bg-transaction-cash text-white border-0",
    upi: "bg-transaction-upi text-white border-0", 
    credit_card: "bg-transaction-card text-white border-0",
    gift_voucher: "bg-transaction-voucher text-white border-0"
  } as const
  
  return badgeStyles[type as keyof typeof badgeStyles] || "bg-gray-500 text-white"
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export default function SalesPage() {
  const { profile } = useAuth()
  const { accessibleStores, isAllStoresSelected } = useStore()
  const [sales, setSales] = useState<SaleWithStore[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      from: new Date(),
      to: new Date(),
      preset: 'Today'
    },
    storeIds: [],
    storeId: null
  })
  
  // Edit sale state
  const [editingSale, setEditingSale] = useState<SaleWithStore | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    amount: '',
    tender_type: '',
    notes: ''
  })

  // Remove manual filter initialization - now handled by FilterBar

  // Load sales data when filters change
  useEffect(() => {
    if (!profile || !accessibleStores || accessibleStores.length === 0) return

    const loadSalesData = async () => {
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
        
        const salesData = await getSalesForDateRange(
          fromDate, 
          toDate, 
          storeFilter
        )
        
        setSales(salesData)
      } catch (error) {
        console.error('Error loading sales:', error)
        toast.error('Failed to load sales data')
      } finally {
        setLoading(false)
      }
    }

    loadSalesData()
  }, [filters, profile, accessibleStores])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const getTotalAmount = () => {
    return sales.reduce((sum, sale) => sum + sale.amount, 0)
  }

  const getTotalCount = () => {
    return sales.length
  }

  const handleEditSale = (sale: SaleWithStore) => {
    setEditingSale(sale)
    setEditFormData({
      amount: sale.amount.toString(),
      tender_type: sale.tender_type,
      notes: sale.notes || ''
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSale) return

    setEditLoading(true)
    try {
      const amount = parseFloat(editFormData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      if (!editingSale?.id) {
        throw new Error('Invalid sale ID')
      }
      
      await updateSale(editingSale.id, {
        amount,
        tender_type: editFormData.tender_type,
        notes: editFormData.notes
      })

      // Update local state
      setSales(prev => prev.map(sale => 
        sale.id === editingSale.id 
          ? { ...sale, amount, tender_type: editFormData.tender_type, notes: editFormData.notes }
          : sale
      ))

      toast.success('Sale updated successfully!')
      setEditingSale(null)
      setEditFormData({ amount: '', tender_type: '', notes: '' })
    } catch (error) {
      console.error('Error updating sale:', error)
      toast.error('Failed to update sale. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditCancel = () => {
    setEditingSale(null)
    setEditFormData({ amount: '', tender_type: '', notes: '' })
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
              <h2 className="text-3xl font-bold tracking-tight">Sales</h2>
              <p className="text-muted-foreground">
                Manage and track all sales transactions
              </p>
            </div>
            <Link href="/sales/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Sale
              </Button>
            </Link>
          </div>

          {/* Filter Bar */}
          <FilterBar onFiltersChange={handleFiltersChange} />

          {/* Summary Cards */}
          {!loading && filters && (
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(getTotalAmount())}</div>
                  <p className="text-xs text-muted-foreground">
                    {getTotalCount()} transaction{getTotalCount() !== 1 ? 's' : ''}
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Store Filter</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {filters.storeName || 'All Stores'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {accessibleStores.length} accessible store{accessibleStores.length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Transactions</CardTitle>
              <CardDescription>
                {filters?.storeName ? `Sales from ${filters.storeName}` : 'Sales from all accessible stores'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading sales...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Date</TableHead>
                          <TableHead className="min-w-[120px]">Store</TableHead>
                          <TableHead className="min-w-[100px]">Amount</TableHead>
                          <TableHead className="min-w-[120px]">Payment</TableHead>
                          <TableHead className="min-w-[150px]">Notes</TableHead>
                          <TableHead className="min-w-[100px]">Time</TableHead>
                          <TableHead className="min-w-[80px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                              {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{sale.stores.store_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {sale.stores.store_code}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(sale.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getTenderTypeBadge(sale.tender_type)}>
                                {sale.tender_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {sale.notes || '-'}
                            </TableCell>
                            <TableCell>
                              {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '--:--'}
                            </TableCell>
                            <TableCell>
                              {canEditTransaction(sale.status || 'pending', profile?.role || 'cashier') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditSale(sale)}
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
                  
                  {sales.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No sales found for the selected period.</p>
                      <Link href="/sales/new">
                        <Button className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Add New Sale
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
                <span className="ml-2">Loading sales...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {sales.map((sale) => (
                  <Card key={sale.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{sale.stores.store_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {sale.stores.store_code}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                        <Badge className={getTenderTypeBadge(sale.tender_type)}>
                          {sale.tender_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">
                          {formatCurrency(sale.amount)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '--:--'}
                        </span>
                      </div>
                      {sale.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {sale.notes}
                        </p>
                      )}
                      
                      {canEditTransaction(sale.status || 'pending', profile?.role || 'cashier') && (
                        <div className="flex justify-end mt-3 pt-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSale(sale)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {sales.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No sales found for the selected period.</p>
                    <Link href="/sales/new">
                      <Button className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Sale
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Edit Sale Dialog */}
          <Dialog open={!!editingSale} onOpenChange={(open) => !open && handleEditCancel()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Sale</DialogTitle>
                <DialogDescription>
                  Update the sale transaction details
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
                  <Label htmlFor="edit_tender_type">Payment Method *</Label>
                  <TenderTypeSelect
                    value={editFormData.tender_type}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, tender_type: value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Notes</Label>
                  <Textarea
                    id="edit_notes"
                    placeholder="Any additional notes..."
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="min-h-[80px]"
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