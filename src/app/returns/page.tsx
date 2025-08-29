"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { getReturnsForDateRange, updateReturn, type ReturnSummary } from "@/lib/returns-service"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RotateCcw, Plus, Search, Calendar, IndianRupee, User, Receipt, CheckCircle, Clock, AlertTriangle, Loader2, Eye, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { toast } from "sonner"


const getStatusBadge = (status: string, expiryDate: string) => {
  const isExpiringSoon = new Date(expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  
  if (status === 'active' && isExpiringSoon) {
    return <Badge variant="destructive" className="text-orange-600"><Clock className="h-3 w-3 mr-1" />Expiring Soon</Badge>
  }
  
  const variants = {
    active: "default",
    redeemed: "secondary", 
    expired: "destructive"
  } as const

  const colors = {
    active: "text-green-600",
    redeemed: "text-gray-600",
    expired: "text-red-600"
  } as const

  const icons = {
    active: CheckCircle,
    redeemed: CheckCircle,
    expired: AlertTriangle
  }

  const IconComponent = icons[status as keyof typeof icons]
  
  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"} 
           className={colors[status as keyof typeof colors]}>
      <IconComponent className="h-3 w-3 mr-1" />
      {status.toUpperCase()}
    </Badge>
  )
}

const getReturnReasonBadge = (reason: string) => {
  const reasonLabels = {
    defective: "Defective/Damaged",
    wrong_size: "Wrong Size", 
    wrong_item: "Wrong Item",
    not_as_described: "Not as Described",
    change_of_mind: "Change of Mind",
    duplicate_order: "Duplicate Order",
    other: "Other"
  } as const

  const colors = {
    defective: "bg-red-100 text-red-800",
    wrong_size: "bg-blue-100 text-blue-800",
    wrong_item: "bg-purple-100 text-purple-800", 
    not_as_described: "bg-yellow-100 text-yellow-800",
    change_of_mind: "bg-pink-100 text-pink-800",
    duplicate_order: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800"
  } as const

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[reason as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {reasonLabels[reason as keyof typeof reasonLabels] || reason.replace('_', ' ').toUpperCase()}
    </span>
  )
}

export default function RRNsPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [returns, setReturns] = useState<ReturnSummary[]>([])
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
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRRN, setSelectedRRN] = useState<ReturnSummary | null>(null)
  
  // Edit return state
  const [editingReturn, setEditingReturn] = useState<ReturnSummary | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    original_bill_reference: '',
    return_amount: '',
    refund_method: '',
    customer_name: '',
    reason: '',
    notes: ''
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

  // Load returns data when filters change
  useEffect(() => {
    if (!profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }

    const loadReturnsData = async () => {
      try {
        setLoading(true)
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
        
        const returnsData = await getReturnsForDateRange(fromDate, toDate, storeFilter)
        setReturns(returnsData || [])
      } catch (error) {
        console.error('Error loading returns:', error)
        toast.error('Failed to load returns data')
        setReturns([])
      } finally {
        setLoading(false)
      }
    }

    loadReturnsData()
  }, [filters, profile, accessibleStores])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const filteredRRNs = returns.filter(returnItem => 
    returnItem.original_bill_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    returnItem.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const totalRRNs = returns.length
  const totalAmount = returns.reduce((sum, r) => sum + r.return_amount, 0)
  const totalCount = returns.length

  const handleEditReturn = (returnItem: ReturnSummary) => {
    setEditingReturn(returnItem)
    setEditFormData({
      original_bill_reference: returnItem.original_bill_reference,
      return_amount: returnItem.return_amount.toString(),
      refund_method: returnItem.refund_method,
      customer_name: returnItem.customer_name,
      reason: returnItem.reason || '',
      notes: '' // Notes from full return data would need separate fetch
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReturn) return

    setEditLoading(true)
    try {
      const amount = parseFloat(editFormData.return_amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid return amount')
        return
      }

      if (!editingReturn?.id) {
        throw new Error('Invalid return ID')
      }
      
      await updateReturn(editingReturn.id, {
        original_bill_reference: editFormData.original_bill_reference,
        return_amount: amount,
        refund_method: editFormData.refund_method,
        customer_name: editFormData.customer_name,
        reason: editFormData.reason,
        notes: editFormData.notes
      })

      // Update local state
      setReturns(prev => prev.map(returnItem => 
        returnItem.id === editingReturn.id 
          ? { 
              ...returnItem, 
              original_bill_reference: editFormData.original_bill_reference,
              return_amount: amount, 
              refund_method: editFormData.refund_method,
              customer_name: editFormData.customer_name,
              reason: editFormData.reason
            }
          : returnItem
      ))

      toast.success('Return updated successfully!')
      setEditingReturn(null)
      setEditFormData({ original_bill_reference: '', return_amount: '', refund_method: '', customer_name: '', reason: '', notes: '' })
    } catch (error) {
      console.error('Error updating return:', error)
      toast.error('Failed to update return. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditCancel = () => {
    setEditingReturn(null)
    setEditFormData({ original_bill_reference: '', return_amount: '', refund_method: '', customer_name: '', reason: '', notes: '' })
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Returns</h2>
              <p className="text-muted-foreground">
                Manage product returns and refunds
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/returns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Process Return
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

          {/* Summary Stats */}
          {!loading && filters && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCount}</div>
                <p className="text-xs text-muted-foreground">
                  {filters.dateRange.preset || 'Custom period'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  Returned value
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Return</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalCount > 0 ? formatCurrency(totalAmount / totalCount) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Returns Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Returns {!loading && `(${filteredRRNs.length})`}</CardTitle>
                  <CardDescription>
                    {filters?.dateRange ? 
                      `Returns from ${format(filters.dateRange.from, 'MMM dd')} - ${format(filters.dateRange.to, 'MMM dd, yyyy')}` :
                      'Track and manage product returns and refunds'
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search returns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading returns...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return Details</TableHead>
                      <TableHead>Customer Info</TableHead>
                      <TableHead>Amount & Method</TableHead>
                      <TableHead>Return Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRRNs.map((returnItem) => (
                      <TableRow key={returnItem.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <RotateCcw className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{returnItem.original_bill_reference}</p>
                              <p className="text-sm text-muted-foreground">{returnItem.stores?.store_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{returnItem.customer_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(returnItem.return_amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              {returnItem.refund_method?.replace('_', ' ').toUpperCase()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {returnItem.reason || 'Not specified'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(returnItem.return_date).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {returnItem.created_at ? new Date(returnItem.created_at).toLocaleTimeString('en-IN') : 'Unknown time'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canEditTransaction(returnItem.status || 'pending', profile?.role || 'cashier') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditReturn(returnItem)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRRN(returnItem)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Return Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for {returnItem.original_bill_reference}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Original Bill</p>
                                      <p className="text-sm text-muted-foreground">{returnItem.original_bill_reference}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Store</p>
                                      <p className="text-sm text-muted-foreground">{returnItem.stores?.store_name}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Return Amount</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(returnItem.return_amount)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Refund Method</p>
                                      <p className="text-sm text-muted-foreground">{returnItem.refund_method?.replace('_', ' ').toUpperCase()}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Customer Details</p>
                                    <p className="text-sm text-muted-foreground">{returnItem.customer_name}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Return Date</p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(returnItem.return_date).toLocaleDateString('en-IN')}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Return Reason</p>
                                    <p className="text-sm text-muted-foreground">
                                      {returnItem.reason || 'Not specified'}
                                    </p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  </div>
                  
                  {filteredRRNs.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "No returns match your search" : "No returns found for the selected period"}
                      </p>
                      {!searchTerm && (
                        <Link href="/returns/new">
                          <Button className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Process First Return
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Return Dialog */}
          <Dialog open={!!editingReturn} onOpenChange={(open) => !open && handleEditCancel()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Return</DialogTitle>
                <DialogDescription>
                  Update the return transaction details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_bill_reference">Return Reference Number *</Label>
                  <Input
                    id="edit_bill_reference"
                    type="text"
                    placeholder="Original bill reference"
                    value={editFormData.original_bill_reference}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, original_bill_reference: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_return_amount">Return Amount (₹) *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit_return_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={editFormData.return_amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, return_amount: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_refund_method">Refund Method *</Label>
                  <Select value={editFormData.refund_method} onValueChange={(value) => setEditFormData(prev => ({ ...prev, refund_method: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select refund method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="store_credit">Store Credit</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_customer_name">Customer Name *</Label>
                  <Input
                    id="edit_customer_name"
                    type="text"
                    placeholder="Customer name"
                    value={editFormData.customer_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_reason">Return Reason</Label>
                  <Select value={editFormData.reason} onValueChange={(value) => setEditFormData(prev => ({ ...prev, reason: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select return reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defective">Defective/Damaged</SelectItem>
                      <SelectItem value="wrong_size">Wrong Size</SelectItem>
                      <SelectItem value="wrong_item">Wrong Item</SelectItem>
                      <SelectItem value="not_as_described">Not as Described</SelectItem>
                      <SelectItem value="change_of_mind">Change of Mind</SelectItem>
                      <SelectItem value="duplicate_order">Duplicate Order</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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