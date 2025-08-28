"use client"

import { useState, useEffect } from "react"
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
import { FileText, Plus, Search, Calendar, IndianRupee, Camera, CheckCircle, AlertTriangle, Clock, Loader2, ExternalLink, Image, Eye, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { getHandBillsForDateRange, updateHandBill, type HandBillSummary } from "@/lib/hand-bills-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { toast } from "sonner"


const getStatusBadge = (status: string) => {
  const variants = {
    pending: "secondary",
    converted: "default", 
    cancelled: "destructive"
  } as const

  const colors = {
    pending: "text-orange-600",
    converted: "text-green-600",
    cancelled: "text-red-600"
  } as const

  const icons = {
    pending: Clock,
    converted: CheckCircle,
    cancelled: AlertTriangle
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

const getTenderTypeBadge = (tenderType: string) => {
  const colors = {
    cash: "bg-green-100 text-green-800",
    upi: "bg-blue-100 text-blue-800", 
    credit_card: "bg-purple-100 text-purple-800",
    gift_voucher: "bg-pink-100 text-pink-800",
    bank_transfer: "bg-gray-100 text-gray-800"
  } as const

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tenderType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {tenderType.replace('_', ' ').toUpperCase()}
    </span>
  )
}

export default function HandBillsPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [handBills, setHandBills] = useState<HandBillSummary[]>([])
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
  const [selectedBill, setSelectedBill] = useState<HandBillSummary | null>(null)
  
  // Edit hand bill state
  const [editingBill, setEditingBill] = useState<HandBillSummary | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    bill_number: '',
    total_amount: '',
    tender_type: '',
    customer_name: '',
    items_description: '',
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

  // Load hand bills data when filters change
  useEffect(() => {
    if (!profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }

    const loadHandBillsData = async () => {
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
        
        const handBillsData = await getHandBillsForDateRange(fromDate, toDate, storeFilter)
        setHandBills(handBillsData || [])
      } catch (error) {
        console.error('Error loading hand bills:', error)
        toast.error('Failed to load hand bills data')
        setHandBills([])
      } finally {
        setLoading(false)
      }
    }

    loadHandBillsData()
  }, [filters, profile, accessibleStores])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const filteredBills = handBills.filter(bill => 
    bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const handleEditBill = (bill: HandBillSummary) => {
    setEditingBill(bill)
    setEditFormData({
      bill_number: bill.bill_number || '',
      total_amount: bill.total_amount.toString(),
      tender_type: bill.tender_type,
      customer_name: bill.customer_name || '',
      items_description: '', // Would need full bill data
      notes: '' // Would need full bill data
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBill) return

    setEditLoading(true)
    try {
      const amount = parseFloat(editFormData.total_amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      if (!editingBill?.id) {
        throw new Error('Invalid hand bill ID')
      }
      
      await updateHandBill(editingBill.id, {
        bill_number: editFormData.bill_number,
        total_amount: amount,
        tender_type: editFormData.tender_type,
        customer_name: editFormData.customer_name,
        items_description: editFormData.items_description,
        notes: editFormData.notes
      })

      // Update local state
      setHandBills(prev => prev.map(bill => 
        bill.id === editingBill?.id 
          ? { 
              ...bill, 
              bill_number: editFormData.bill_number,
              total_amount: amount, 
              tender_type: editFormData.tender_type,
              customer_name: editFormData.customer_name
            }
          : bill
      ))

      toast.success('Hand Bill updated successfully!')
      setEditingBill(null)
      setEditFormData({ bill_number: '', total_amount: '', tender_type: '', customer_name: '', items_description: '', notes: '' })
    } catch (error) {
      console.error('Error updating hand bill:', error)
      toast.error('Failed to update hand bill. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditCancel = () => {
    setEditingBill(null)
    setEditFormData({ bill_number: '', total_amount: '', tender_type: '', customer_name: '', items_description: '', notes: '' })
  }

  const totalBills = handBills.length
  const pendingBills = handBills.filter(b => b.status === 'pending').length
  const convertedBills = handBills.filter(b => b.status === 'converted').length
  const totalValue = handBills.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + b.total_amount, 0)
  const pendingValue = handBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.total_amount, 0)

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
              <h2 className="text-3xl font-bold tracking-tight">Hand Bills</h2>
              <p className="text-muted-foreground">
                POS failure backup - Manual bill entry and conversion
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/hand-bills/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Hand Bill
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
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBills}</div>
                <p className="text-xs text-muted-foreground">
                  All hand bills
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingBills}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting conversion
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{convertedBills}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully processed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Excluding cancelled
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
                <IndianRupee className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(pendingValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Needs conversion
                </p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Hand Bills Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Hand Bills {!loading && `(${filteredBills.length})`}</CardTitle>
                  <CardDescription>
                    {filters?.dateRange ? 
                      `Hand bills from ${format(filters.dateRange.from, 'MMM dd')} - ${format(filters.dateRange.to, 'MMM dd, yyyy')}` :
                      'Manual bills from POS failures and conversions'
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bills..."
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
                  <span className="ml-2">Loading hand bills...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Bill Details</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount & Payment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id || 'bill-' + Math.random()}>
                        <TableCell>
                          {bill.image_url ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="relative group cursor-pointer">
                                  <img 
                                    src={bill.image_url} 
                                    alt={`Bill ${bill.bill_number}`}
                                    className="w-16 h-16 object-cover rounded border hover:border-primary transition-colors"
                                  />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                    <ExternalLink className="h-4 w-4 text-white" />
                                  </div>
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Hand Bill Image - {bill.bill_number}</DialogTitle>
                                  <DialogDescription>
                                    Original hand bill image from {new Date(bill.bill_date).toLocaleDateString('en-IN')}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="mt-4">
                                  <img 
                                    src={bill.image_url} 
                                    alt={`Bill ${bill.bill_number}`}
                                    className="w-full h-auto rounded border"
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                              <Image className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{bill.bill_number}</p>
                              <p className="text-sm text-muted-foreground">{bill.stores?.store_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{bill.customer_name}</p>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(bill.total_amount)}</p>
                            <div className="mt-1">
                              {getTenderTypeBadge(bill.tender_type)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(bill.bill_date).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {bill.created_at ? new Date(bill.created_at).toLocaleTimeString('en-IN') : '-'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(bill.status || 'pending')}
                          {bill.status === 'converted' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Sale: Converted
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canEditTransaction(bill.status || 'pending', profile?.role || 'cashier') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBill(bill)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Hand Bill Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for {bill.bill_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Bill Number</p>
                                      <p className="text-sm text-muted-foreground">{bill.bill_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Status</p>
                                      {getStatusBadge(bill.status || 'pending')}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Amount</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(bill.total_amount)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Payment Method</p>
                                      {getTenderTypeBadge(bill.tender_type)}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Customer</p>
                                    <p className="text-sm text-muted-foreground">{bill.customer_name}</p>
                                  </div>
                                  
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Bill Date</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(bill.bill_date).toLocaleDateString('en-IN')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Store</p>
                                      <p className="text-sm text-muted-foreground">{bill.stores?.store_name}</p>
                                    </div>
                                  </div>
                                  
                                  {bill.status === 'converted' && (
                                    <div>
                                      <p className="text-sm font-medium">Converted Sale ID</p>
                                      <p className="text-sm text-muted-foreground">Sale converted</p>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <p className="text-sm font-medium">Bill Image</p>
                                    {bill.image_url ? (
                                      <div className="mt-2">
                                        <img 
                                          src={bill.image_url} 
                                          alt={`Bill ${bill.bill_number}`}
                                          className="w-full h-48 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => window.open(bill.image_url, '_blank')}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1 text-center">
                                          Click to view full size
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-2">
                                        <Camera className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">No image available</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {bill.status === 'pending' && (
                              <Link href={`/hand-bills/convert/${bill.id}`} style={!bill.id ? {pointerEvents: 'none', opacity: 0.5} : {}}>
                                <Button size="sm">
                                  Convert
                                </Button>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                  </div>
                  
                  {filteredBills.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "No hand bills match your search" : "No hand bills found for the selected period"}
                      </p>
                      {!searchTerm && (
                        <Link href="/hand-bills/new">
                          <Button className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Add First Hand Bill
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Hand Bill Dialog */}
          <Dialog open={!!editingBill} onOpenChange={(open) => !open && handleEditCancel()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Hand Bill</DialogTitle>
                <DialogDescription>
                  Update the hand bill transaction details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_bill_number">Bill Number *</Label>
                  <Input
                    id="edit_bill_number"
                    type="text"
                    placeholder="Hand bill number"
                    value={editFormData.bill_number}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, bill_number: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_total_amount">Total Amount (₹) *</Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit_total_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={editFormData.total_amount}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_tender_type">Payment Method *</Label>
                  <Select value={editFormData.tender_type} onValueChange={(value) => setEditFormData(prev => ({ ...prev, tender_type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="gift_voucher">Gift Voucher</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_customer_name">Customer Name</Label>
                  <Input
                    id="edit_customer_name"
                    type="text"
                    placeholder="Customer name"
                    value={editFormData.customer_name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_items_description">Items Description</Label>
                  <Textarea
                    id="edit_items_description"
                    placeholder="Description of items..."
                    value={editFormData.items_description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, items_description: e.target.value }))}
                    className="min-h-[60px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_notes">Notes</Label>
                  <Textarea
                    id="edit_notes"
                    placeholder="Any additional notes..."
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="min-h-[60px]"
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