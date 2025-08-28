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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShoppingCart, Plus, Search, Calendar, IndianRupee, User, Package, Truck, Loader2, Eye, Edit, CheckCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { getSalesOrdersForDateRange, type SalesOrderSummary } from "@/lib/sales-orders-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { toast } from "sonner"


const getStatusBadge = (status: string) => {
  const variants = {
    pending: "secondary",
    processing: "default",
    ready: "outline",
    delivered: "default",
    cancelled: "destructive"
  } as const

  const colors = {
    pending: "text-orange-600",
    processing: "text-blue-600", 
    ready: "text-green-600",
    delivered: "text-green-800",
    cancelled: "text-red-600"
  } as const
  
  return (
    <Badge variant={variants[status as keyof typeof variants] || "outline"} 
           className={colors[status as keyof typeof colors]}>
      {status.toUpperCase()}
    </Badge>
  )
}

export default function OrdersPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [orders, setOrders] = useState<SalesOrderSummary[]>([])
  const [loading, setLoading] = useState(false)  // Start with false
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
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderSummary | null>(null)

  // Remove manual filter initialization - now handled by FilterBar

  // Load orders data when filters change
  useEffect(() => {
    if (!profile || !accessibleStores || accessibleStores.length === 0) {
      // Don't show loading if we're just waiting for initial setup
      return
    }

    const loadOrdersData = async () => {
      try {
        setLoading(true)
        
        // Add timeout to prevent indefinite loading
        const timeoutId = setTimeout(() => {
          console.error('Orders loading timed out')
          toast.error('Loading timed out. Please refresh the page.')
          setLoading(false)
          setOrders([])
        }, 15000) // 15 second timeout
        
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
        
        console.log('Loading orders with filter:', { fromDate, toDate, storeFilter })
        const ordersData = await getSalesOrdersForDateRange(fromDate, toDate, storeFilter)
        clearTimeout(timeoutId)
        
        console.log('Orders loaded:', ordersData)
        setOrders(ordersData || [])
      } catch (error) {
        console.error('Error loading orders:', error)
        toast.error('Failed to load orders data')
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    loadOrdersData()
  }, [filters, profile, accessibleStores])

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const filteredOrders = orders.filter(order => 
    order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_phone?.includes(searchTerm)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length
  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0)
  const totalAdvance = orders.reduce((sum, o) => sum + (o.advance_amount || 0), 0)
  const pendingPayments = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
    .reduce((sum, o) => sum + (o.balance_amount || 0), 0)

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
              <h2 className="text-3xl font-bold tracking-tight">Sales Orders</h2>
              <p className="text-muted-foreground">
                Manage sales orders and track delivery status
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/orders/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Order
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
          {!loading && (
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  {filters.dateRange.preset || 'Custom period'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                <Package className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting processing
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Confirmed Orders</CardTitle>
                <Truck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{confirmedOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Ready to fulfill
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
                  Orders value
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
                <IndianRupee className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(pendingPayments)}</div>
                <p className="text-xs text-muted-foreground">
                  Outstanding amount
                </p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sales Orders {!loading && `(${filteredOrders.length})`}</CardTitle>
                  <CardDescription>
                    {`Orders from ${format(filters.dateRange.from, 'MMM dd')} - ${format(filters.dateRange.to, 'MMM dd, yyyy')}`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
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
                  <span className="ml-2">Loading orders...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Customer Info</TableHead>
                      <TableHead>Amount & Payment</TableHead>
                      <TableHead>Status & Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <ShoppingCart className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(order.order_date).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-sm text-muted-foreground">{order.stores?.store_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(order.total_amount)}</p>
                            <div className="text-sm text-muted-foreground">
                              <p>Advance: {formatCurrency(order.advance_amount || 0)}</p>
                              {(order.balance_amount || 0) > 0 && (
                                <p className="text-red-600">Due: {formatCurrency(order.balance_amount || 0)}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="mb-2">
                              {getStatusBadge(order.status || 'pending')}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {order.status === 'delivered' ? (
                                <span>Converted {(order.updated_at || order.created_at) ? new Date(order.updated_at || order.created_at || '').toLocaleDateString('en-IN') : 'Unknown date'}</span>
                              ) : (
                                <span>Created {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : 'Unknown date'}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Order Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for {order.order_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Order Number</p>
                                      <p className="text-sm text-muted-foreground">{order.order_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Status</p>
                                      {getStatusBadge(order.status || 'pending')}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Total Amount</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(order.total_amount)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Balance Due</p>
                                      <p className="text-sm font-semibold text-red-600">{formatCurrency(order.balance_due || 0)}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Customer Details</p>
                                    <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                                    <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Order Date</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Delivery Date</p>
                                      <p className="text-sm text-muted-foreground">
                                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-IN') : 'Not set'}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Items</p>
                                    <p className="text-sm text-muted-foreground">{order.items_count || 0} items ordered</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {canEditTransaction(order.status || 'pending', profile?.role || 'cashier') && (
                              <Link href={`/orders/edit/${order.id}`}>
                                <Button size="sm" variant="secondary">
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </Link>
                            )}
                            
                            {(order.status === 'pending' || order.status === 'confirmed') && (
                              <Link href={`/orders/convert/${order.id}`}>
                                <Button size="sm">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Convert to Sale
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
                  
                  {filteredOrders.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? "No orders match your search" : "No orders found for the selected period"}
                      </p>
                      {!searchTerm && (
                        <Link href="/orders/new">
                          <Button className="mt-2">
                            <Plus className="mr-2 h-4 w-4" />
                            Create First Order
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}