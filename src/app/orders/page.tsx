"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ShoppingCart, Plus, Search, Calendar, IndianRupee, User, Package, Truck } from "lucide-react"
import Link from "next/link"

const mockOrders = [
  {
    id: "1",
    order_number: "SO2025001",
    customer_name: "Rahul Sharma",
    customer_phone: "+91 9876543001",
    total_amount: 2500.00,
    advance_paid: 500.00,
    balance_due: 2000.00,
    status: "pending",
    delivery_date: "2025-01-25",
    order_date: "2025-01-20",
    items_count: 3,
    created_at: "2025-01-20T10:30:00Z"
  },
  {
    id: "2",
    order_number: "SO2025002",
    customer_name: "Priya Patel",
    customer_phone: "+91 9876543002",
    total_amount: 1800.00,
    advance_paid: 1800.00,
    balance_due: 0.00,
    status: "ready",
    delivery_date: "2025-01-22",
    order_date: "2025-01-19",
    items_count: 2,
    created_at: "2025-01-19T14:20:00Z"
  },
  {
    id: "3",
    order_number: "SO2025003",
    customer_name: "Amit Kumar",
    customer_phone: "+91 9876543003",
    total_amount: 3200.00,
    advance_paid: 1000.00,
    balance_due: 2200.00,
    status: "delivered",
    delivery_date: "2025-01-18",
    order_date: "2025-01-15",
    items_count: 5,
    created_at: "2025-01-15T09:15:00Z"
  },
  {
    id: "4",
    order_number: "SO2025004",
    customer_name: "Sneha Singh",
    customer_phone: "+91 9876543004",
    total_amount: 4500.00,
    advance_paid: 2000.00,
    balance_due: 2500.00,
    status: "processing",
    delivery_date: "2025-01-30",
    order_date: "2025-01-20",
    items_count: 4,
    created_at: "2025-01-20T16:45:00Z"
  },
  {
    id: "5",
    order_number: "SO2025005",
    customer_name: "Vikram Gupta",
    customer_phone: "+91 9876543005",
    total_amount: 1200.00,
    advance_paid: 0.00,
    balance_due: 1200.00,
    status: "cancelled",
    delivery_date: "2025-01-24",
    order_date: "2025-01-18",
    items_count: 1,
    created_at: "2025-01-18T11:10:00Z"
  }
]

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
  const [orders] = useState(mockOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState(null)

  const filteredOrders = orders.filter(order => 
    order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_phone.includes(searchTerm)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const totalOrders = orders.length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const readyOrders = orders.filter(o => o.status === 'ready').length
  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0)
  const pendingPayments = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'delivered')
    .reduce((sum, o) => sum + o.balance_due, 0)

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

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-5 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  All time orders
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
                <CardTitle className="text-sm font-medium">Ready for Delivery</CardTitle>
                <Truck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{readyOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Ready to ship
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
                <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
                <IndianRupee className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(pendingPayments)}</div>
                <p className="text-xs text-muted-foreground">
                  Due amount
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Sales Orders ({filteredOrders.length})</CardTitle>
                  <CardDescription>
                    Track and manage sales order lifecycle
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Details</TableHead>
                      <TableHead>Customer Info</TableHead>
                      <TableHead>Amount & Payment</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Status</TableHead>
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
                                {order.items_count} items • {new Date(order.order_date).toLocaleDateString('en-IN')}
                              </p>
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
                              <p>Paid: {formatCurrency(order.advance_paid)}</p>
                              {order.balance_due > 0 && (
                                <p className="text-red-600">Due: {formatCurrency(order.balance_due)}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(order.delivery_date).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.delivery_date) > new Date() 
                                  ? `${Math.ceil((new Date(order.delivery_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                                  : new Date(order.delivery_date).toDateString() === new Date().toDateString()
                                  ? 'Today'
                                  : 'Overdue'
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(order.status)}
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
                                  View Details
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
                                      {getStatusBadge(order.status)}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Total Amount</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(order.total_amount)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Balance Due</p>
                                      <p className="text-sm font-semibold text-red-600">{formatCurrency(order.balance_due)}</p>
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
                                        {new Date(order.delivery_date).toLocaleDateString('en-IN')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Items</p>
                                    <p className="text-sm text-muted-foreground">{order.items_count} items ordered</p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {order.status === 'pending' && (
                              <Link href={`/orders/edit/${order.id}`}>
                                <Button size="sm" variant="secondary">
                                  Edit
                                </Button>
                              </Link>
                            )}
                            
                            {order.status === 'ready' && (
                              <Button size="sm">
                                Mark Delivered
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredOrders.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No orders match your search" : "No orders found"}
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
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}