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
import { RotateCcw, Plus, Search, Calendar, IndianRupee, User, Receipt, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"

const mockRRNs = [
  {
    id: "1",
    rrn_number: "RRN001",
    sales_bill_number: "BILL-2025-001",
    rrn_date: "2025-01-22",
    rrn_amount: 850.00,
    balance: 850.00,
    tender_type: "cash",
    customer_name: "Rahul Sharma",
    customer_phone: "+91 9876543001",
    return_reason: "defective",
    status: "active",
    expiry_date: "2026-01-22",
    remarks: "Shirt had a tear on the sleeve",
    created_at: "2025-01-22T10:30:00Z"
  },
  {
    id: "2",
    rrn_number: "RRN002", 
    sales_bill_number: "BILL-2025-002",
    rrn_date: "2025-01-21",
    rrn_amount: 1250.00,
    balance: 0.00,
    tender_type: "upi",
    customer_name: "Priya Patel",
    customer_phone: "+91 9876543002",
    return_reason: "wrong_size",
    status: "redeemed",
    expiry_date: "2026-01-21",
    remarks: "Size L needed instead of M",
    created_at: "2025-01-21T14:20:00Z"
  },
  {
    id: "3",
    rrn_number: "RRN003",
    sales_bill_number: "BILL-2025-003", 
    rrn_date: "2025-01-20",
    rrn_amount: 650.00,
    balance: 650.00,
    tender_type: "credit_card",
    customer_name: "Amit Kumar",
    customer_phone: "+91 9876543003",
    return_reason: "change_of_mind",
    status: "active",
    expiry_date: "2026-01-20",
    remarks: "",
    created_at: "2025-01-20T09:15:00Z"
  },
  {
    id: "4",
    rrn_number: "RRN004",
    sales_bill_number: "BILL-2024-999",
    rrn_date: "2024-03-15",
    rrn_amount: 400.00,
    balance: 400.00,
    tender_type: "cash",
    customer_name: "Sneha Singh",
    customer_phone: "+91 9876543004",
    return_reason: "other",
    status: "expired",
    expiry_date: "2025-03-15",
    remarks: "Customer moved to different city",
    created_at: "2024-03-15T16:45:00Z"
  }
]

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
  const [rrns] = useState(mockRRNs)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRRN, setSelectedRRN] = useState(null)

  const filteredRRNs = rrns.filter(rrn => 
    rrn.rrn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rrn.sales_bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rrn.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rrn.customer_phone.includes(searchTerm)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const totalRRNs = rrns.length
  const activeRRNs = rrns.filter(r => r.status === 'active').length
  const totalLiability = rrns
    .filter(r => r.status === 'active')
    .reduce((sum, r) => sum + r.balance, 0)
  const expiringSoon = rrns.filter(r => {
    const isActive = r.status === 'active'
    const isExpiringSoon = new Date(r.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return isActive && isExpiringSoon
  }).length

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
              <h2 className="text-3xl font-bold tracking-tight">Return Receipt Notes (RRN)</h2>
              <p className="text-muted-foreground">
                Manage store credit notes for customer returns
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/returns/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Issue RRN
                </Button>
              </Link>
              <Link href="/returns/redeem-for-sale">
                <Button variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Redeem RRN
                </Button>
              </Link>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total RRNs</CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRRNs}</div>
                <p className="text-xs text-muted-foreground">
                  All return notes
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active RRNs</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeRRNs}</div>
                <p className="text-xs text-muted-foreground">
                  Available for redemption
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
          </div>

          {/* RRN Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Return Receipt Notes ({filteredRRNs.length})</CardTitle>
                  <CardDescription>
                    Track and manage store credit notes and redemptions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search RRNs..."
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
                      <TableHead>RRN Details</TableHead>
                      <TableHead>Customer Info</TableHead>
                      <TableHead>Amount & Balance</TableHead>
                      <TableHead>Return Reason</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRRNs.map((rrn) => (
                      <TableRow key={rrn.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <RotateCcw className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{rrn.rrn_number}</p>
                              <p className="text-sm text-muted-foreground">
                                Bill: {rrn.sales_bill_number}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(rrn.rrn_date).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rrn.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{rrn.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(rrn.rrn_amount)}</p>
                            <p className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(rrn.balance)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {getReturnReasonBadge(rrn.return_reason)}
                            {rrn.remarks && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                                {rrn.remarks}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(rrn.expiry_date).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(rrn.expiry_date) > new Date() 
                                  ? `${Math.ceil((new Date(rrn.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                                  : 'Expired'
                                }
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(rrn.status, rrn.expiry_date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedRRN(rrn)}
                                >
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>RRN Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for {rrn.rrn_number}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">RRN Number</p>
                                      <p className="text-sm text-muted-foreground">{rrn.rrn_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Status</p>
                                      {getStatusBadge(rrn.status, rrn.expiry_date)}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">RRN Amount</p>
                                      <p className="text-sm text-muted-foreground">{formatCurrency(rrn.rrn_amount)}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Available Balance</p>
                                      <p className="text-sm font-semibold text-green-600">{formatCurrency(rrn.balance)}</p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Customer Details</p>
                                    <p className="text-sm text-muted-foreground">{rrn.customer_name}</p>
                                    <p className="text-sm text-muted-foreground">{rrn.customer_phone}</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm font-medium">Original Bill</p>
                                      <p className="text-sm text-muted-foreground">{rrn.sales_bill_number}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">Return Date</p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(rrn.rrn_date).toLocaleDateString('en-IN')}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Return Reason</p>
                                    {getReturnReasonBadge(rrn.return_reason)}
                                    {rrn.remarks && (
                                      <p className="text-sm text-muted-foreground mt-1">{rrn.remarks}</p>
                                    )}
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm font-medium">Expiry Date</p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(rrn.expiry_date).toLocaleDateString('en-IN')}
                                    </p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {rrn.status === 'active' && rrn.balance > 0 && (
                              <Link href={`/returns/redeem?rrn=${rrn.rrn_number}`}>
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
              
              {filteredRRNs.length === 0 && (
                <div className="text-center py-8">
                  <RotateCcw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No RRNs match your search" : "No RRNs found"}
                  </p>
                  {!searchTerm && (
                    <Link href="/returns/new">
                      <Button className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Issue First RRN
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