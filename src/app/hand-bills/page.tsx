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
import { FileText, Plus, Search, Calendar, IndianRupee, Camera, CheckCircle, AlertTriangle, Clock } from "lucide-react"
import Link from "next/link"

const mockHandBills = [
  {
    id: "1",
    bill_number: "HB001",
    bill_date: "2025-01-22",
    total_amount: 1250.00,
    tender_type: "cash",
    customer_name: "Walk-in Customer",
    status: "pending",
    image_url: "/images/handbill1.jpg",
    store_name: "Main Store",
    created_at: "2025-01-22T10:30:00Z"
  },
  {
    id: "2", 
    bill_number: "HB002",
    bill_date: "2025-01-22",
    total_amount: 850.00,
    tender_type: "upi",
    customer_name: "Rajesh Kumar",
    status: "converted",
    converted_sale_id: "S2025001",
    image_url: "/images/handbill2.jpg",
    store_name: "Main Store",
    created_at: "2025-01-22T11:15:00Z"
  },
  {
    id: "3",
    bill_number: "HB003", 
    bill_date: "2025-01-21",
    total_amount: 2100.00,
    tender_type: "credit_card",
    customer_name: "Priya Sharma",
    status: "pending",
    image_url: "/images/handbill3.jpg",
    store_name: "Main Store",
    created_at: "2025-01-21T16:45:00Z"
  },
  {
    id: "4",
    bill_number: "HB004",
    bill_date: "2025-01-21", 
    total_amount: 675.00,
    tender_type: "cash",
    customer_name: "Walk-in Customer",
    status: "cancelled",
    image_url: "/images/handbill4.jpg",
    store_name: "Main Store",
    created_at: "2025-01-21T14:20:00Z"
  },
  {
    id: "5",
    bill_number: "HB005",
    bill_date: "2025-01-20",
    total_amount: 1450.00,
    tender_type: "upi",
    customer_name: "Amit Patel",
    status: "converted",
    converted_sale_id: "S2025003",
    image_url: "/images/handbill5.jpg",
    store_name: "Main Store",
    created_at: "2025-01-20T13:10:00Z"
  }
]

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
  const [handBills] = useState(mockHandBills)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBill, setSelectedBill] = useState(null)

  const filteredBills = handBills.filter(bill => 
    bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
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

          {/* Summary Stats */}
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

          {/* Hand Bills Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Hand Bills ({filteredBills.length})</CardTitle>
                  <CardDescription>
                    Manual bills from POS failures and conversions
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableRow key={bill.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{bill.bill_number}</p>
                              <p className="text-sm text-muted-foreground">{bill.store_name}</p>
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
                                {new Date(bill.created_at).toLocaleTimeString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(bill.status)}
                          {bill.status === 'converted' && bill.converted_sale_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Sale: {bill.converted_sale_id}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBill(bill)}
                                >
                                  View Details
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
                                      {getStatusBadge(bill.status)}
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
                                      <p className="text-sm text-muted-foreground">{bill.store_name}</p>
                                    </div>
                                  </div>
                                  
                                  {bill.converted_sale_id && (
                                    <div>
                                      <p className="text-sm font-medium">Converted Sale ID</p>
                                      <p className="text-sm text-muted-foreground">{bill.converted_sale_id}</p>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <p className="text-sm font-medium">Bill Image</p>
                                    <div className="mt-2 p-3 bg-muted rounded-lg flex items-center gap-2">
                                      <Camera className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">Image available</span>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {bill.status === 'pending' && (
                              <Link href={`/hand-bills/convert/${bill.id}`}>
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
              
              {filteredBills.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No hand bills match your search" : "No hand bills found"}
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
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}