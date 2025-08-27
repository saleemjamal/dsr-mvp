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
import { Gift, Plus, Search, AlertTriangle, Calendar, IndianRupee, Loader2, Eye, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { getVouchersForDateRange, updateVoucher, type GiftVoucherSummary } from "@/lib/gift-vouchers-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { toast } from "sonner"

// Gift Vouchers are not store-specific in this system, so we show all vouchers but with date filtering
// Mock data removed - now using real data from getVouchersForDateRange

const getStatusBadge = (status: string, expiryDate?: string) => {
  const isExpiringSoon = expiryDate ? new Date(expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false // 30 days
  
  if (status === 'active' && isExpiringSoon) {
    return <Badge variant="destructive">Expiring Soon</Badge>
  }
  
  const variants = {
    active: "default",
    redeemed: "secondary", 
    expired: "destructive",
    cancelled: "outline"
  } as const
  
  return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.toUpperCase()}</Badge>
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export default function VouchersPage() {
  const { profile } = useAuth()
  const [vouchers, setVouchers] = useState<GiftVoucherSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  
  // Edit voucher state
  const [editingVoucher, setEditingVoucher] = useState<GiftVoucherSummary | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editFormData, setEditFormData] = useState({
    voucher_number: '',
    amount: '',
    customer_name: '',
    customer_phone: '',
    expiry_date: '',
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
        storeIds: [] // Gift vouchers are not store-specific
      })
    }
  }, [filters])

  // Load vouchers data when filters change
  useEffect(() => {
    if (!filters || !profile) return

    const loadVouchersData = async () => {
      try {
        setLoading(true)
        const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
        const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
        
        // Gift Vouchers are not store-specific, so we get all vouchers for the date range
        const vouchersData = await getVouchersForDateRange(fromDate, toDate)
        setVouchers(vouchersData)
      } catch (error) {
        console.error('Error loading vouchers:', error)
        toast.error('Failed to load vouchers data')
      } finally {
        setLoading(false)
      }
    }

    loadVouchersData()
  }, [filters, profile])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const filteredVouchers = vouchers.filter(voucher => 
    voucher.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (voucher.customer_name && voucher.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (voucher.customer_phone && voucher.customer_phone.includes(searchTerm))
  )

  const activeVouchers = vouchers.filter(v => v.status === 'active').length
  const totalLiability = vouchers
    .filter(v => v.status === 'active')
    .reduce((sum, v) => sum + v.balance, 0)
  const expiringSoon = vouchers.filter(v => {
    const isActive = v.status === 'active'
    const isExpiringSoon = v.expiry_date ? new Date(v.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false
    return isActive && isExpiringSoon
  }).length

  const handleEditVoucher = (voucher: GiftVoucherSummary) => {
    setEditingVoucher(voucher)
    setEditFormData({
      voucher_number: voucher.voucher_number,
      amount: voucher.amount.toString(),
      customer_name: voucher.customer_name || '',
      customer_phone: voucher.customer_phone || '',
      expiry_date: voucher.expiry_date || '',
      notes: '' // Would need full voucher data
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingVoucher) return

    setEditLoading(true)
    try {
      const amount = parseFloat(editFormData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      await updateVoucher(editingVoucher.id, {
        voucher_number: editFormData.voucher_number,
        amount: amount,
        customer_name: editFormData.customer_name,
        customer_phone: editFormData.customer_phone,
        expiry_date: editFormData.expiry_date
      })

      // Update local state
      setVouchers(prev => prev.map(voucher => 
        voucher.id === editingVoucher.id 
          ? { 
              ...voucher, 
              voucher_number: editFormData.voucher_number,
              amount: amount, 
              customer_name: editFormData.customer_name,
              customer_phone: editFormData.customer_phone,
              expiry_date: editFormData.expiry_date
            }
          : voucher
      ))

      toast.success('Gift Voucher updated successfully!')
      setEditingVoucher(null)
      setEditFormData({ voucher_number: '', amount: '', customer_name: '', customer_phone: '', expiry_date: '', notes: '' })
    } catch (error) {
      console.error('Error updating voucher:', error)
      toast.error('Failed to update voucher. Please try again.')
    } finally {
      setEditLoading(false)
    }
  }

  const handleEditCancel = () => {
    setEditingVoucher(null)
    setEditFormData({ voucher_number: '', amount: '', customer_name: '', customer_phone: '', expiry_date: '', notes: '' })
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
              <h2 className="text-3xl font-bold tracking-tight">Gift Vouchers</h2>
              <p className="text-muted-foreground">
                Manage gift vouchers and track redemptions
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/vouchers/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Issue Voucher
                </Button>
              </Link>
              <Link href="/vouchers/redeem">
                <Button variant="outline">
                  <Gift className="mr-2 h-4 w-4" />
                  Redeem Voucher
                </Button>
              </Link>
            </div>
          </div>

          {/* Filter Bar - Note: Gift vouchers are not store-specific, so store filter is hidden */}
          <FilterBar 
            onFiltersChange={handleFiltersChange} 
            showStoreFilter={false} 
            showDateFilter={true}
          />

          {/* Summary Stats */}
          {!loading && filters && (
            <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Vouchers</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeVouchers}</div>
                <p className="text-xs text-muted-foreground">
                  Currently redeemable
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Liability</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalLiability)}</div>
                <p className="text-xs text-muted-foreground">
                  Outstanding balance
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{expiringSoon}</div>
                <p className="text-xs text-muted-foreground">
                  Within 30 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{vouchers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {filters.dateRange.preset || 'Custom period'}
                </p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Search and Voucher Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gift Vouchers {!loading && `(${filteredVouchers.length})`}</CardTitle>
                  <CardDescription>
                    {filters?.dateRange ? 
                      `Vouchers issued from ${format(filters.dateRange.from, 'MMM dd')} - ${format(filters.dateRange.to, 'MMM dd, yyyy')}` :
                      'Track and manage gift voucher lifecycle'
                    }
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search vouchers..."
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
                  <span className="ml-2">Loading vouchers...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Voucher Details</TableHead>
                          <TableHead>Customer Info</TableHead>
                          <TableHead>Amount & Balance</TableHead>
                          <TableHead>Validity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                    {filteredVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Gift className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{voucher.voucher_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Issued: {new Date(voucher.issued_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{voucher.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{voucher.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(voucher.amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(voucher.balance)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(voucher.expiry_date).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(voucher.expiry_date) > new Date() 
                                  ? `${Math.ceil((new Date(voucher.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                                  : 'Expired'
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(voucher.status, voucher.expiry_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canEditTransaction(voucher.status || 'active', profile?.role || 'cashier') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditVoucher(voucher)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedVoucher(voucher)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Voucher Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for {voucher.voucher_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Voucher Number</p>
                                      <p className="text-sm text-muted-foreground">{voucher.voucher_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Status</p>
                                      {getStatusBadge(voucher.status, voucher.expiry_date)}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Original Amount</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(voucher.amount)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Current Balance</p>
                                      <p className="text-sm font-semibold">{formatCurrency(voucher.balance)}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Customer Details</p>
                                    <p className="text-sm text-muted-foreground">{voucher.customer_name}</p>
                                    <p className="text-sm text-muted-foreground">{voucher.customer_phone}</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Issued Date</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(voucher.issued_date).toLocaleDateString('en-IN')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Expiry Date</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(voucher.expiry_date).toLocaleDateString('en-IN')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {voucher.status === 'active' && voucher.balance > 0 && (
                              <Link href={`/vouchers/redeem?voucher=${voucher.voucher_number}`}>
                                <Button size="sm">
                                  Redeem
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
              
                  {filteredVouchers.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "No vouchers match your search" : "No vouchers found for the selected period"}
                      </p>
                      {!searchTerm && (
                        <Link href="/vouchers/new">
                          <Button className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Issue New Voucher
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Gift Voucher Dialog */}
          <Dialog open={!!editingVoucher} onOpenChange={(open) => !open && handleEditCancel()}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Gift Voucher</DialogTitle>
                <DialogDescription>
                  Update the gift voucher details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_voucher_number">Voucher Number *</Label>
                  <Input
                    id="edit_voucher_number"
                    type="text"
                    placeholder="Gift voucher number"
                    value={editFormData.voucher_number}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, voucher_number: e.target.value }))}
                    required
                  />
                </div>

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
                  <Label htmlFor="edit_customer_phone">Customer Phone</Label>
                  <Input
                    id="edit_customer_phone"
                    type="tel"
                    placeholder="Customer phone number"
                    value={editFormData.customer_phone}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, customer_phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_expiry_date">Expiry Date</Label>
                  <Input
                    id="edit_expiry_date"
                    type="date"
                    value={editFormData.expiry_date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
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