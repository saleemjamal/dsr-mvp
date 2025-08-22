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
import { Gift, Plus, Search, AlertTriangle, Calendar, IndianRupee } from "lucide-react"
import Link from "next/link"

// Mock gift voucher data
const mockVouchers = [
  {
    id: "1",
    voucher_number: "GV2025001",
    amount: 1000.00,
    balance: 1000.00,
    status: "active",
    customer_name: "Rahul Sharma",
    customer_phone: "+91 9876543001",
    issued_date: "2025-01-20",
    expiry_date: "2025-12-31",
    created_at: "2025-01-20T10:30:00Z"
  },
  {
    id: "2",
    voucher_number: "GV2025002", 
    amount: 500.00,
    balance: 500.00,
    status: "active",
    customer_name: "Priya Patel",
    customer_phone: "+91 9876543002",
    issued_date: "2025-01-19",
    expiry_date: "2025-06-30",
    created_at: "2025-01-19T14:20:00Z"
  },
  {
    id: "3",
    voucher_number: "GV2025003",
    amount: 2000.00,
    balance: 0.00,
    status: "redeemed",
    customer_name: "Amit Kumar",
    customer_phone: "+91 9876543003",
    issued_date: "2025-01-18",
    expiry_date: "2025-12-31",
    created_at: "2025-01-18T09:15:00Z"
  },
  {
    id: "4",
    voucher_number: "GV2025004",
    amount: 1500.00,
    balance: 1500.00,
    status: "active",
    customer_name: "Sneha Singh",
    customer_phone: "+91 9876543004",
    issued_date: "2025-01-15",
    expiry_date: "2025-02-15", // Expiring soon
    created_at: "2025-01-15T16:45:00Z"
  },
  {
    id: "5",
    voucher_number: "GV2024999",
    amount: 800.00,
    balance: 800.00,
    status: "expired",
    customer_name: "Vikram Gupta",
    customer_phone: "+91 9876543005",
    issued_date: "2024-12-20",
    expiry_date: "2025-01-20",
    created_at: "2024-12-20T11:10:00Z"
  }
]

const getStatusBadge = (status: string, expiryDate: string) => {
  const isExpiringSoon = new Date(expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  
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
  const [vouchers] = useState(mockVouchers)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVoucher, setSelectedVoucher] = useState(null)

  const filteredVouchers = vouchers.filter(voucher => 
    voucher.voucher_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    voucher.customer_phone.includes(searchTerm)
  )

  const activeVouchers = vouchers.filter(v => v.status === 'active').length
  const totalLiability = vouchers
    .filter(v => v.status === 'active')
    .reduce((sum, v) => sum + v.balance, 0)
  const expiringSoon = vouchers.filter(v => {
    const isActive = v.status === 'active'
    const isExpiringSoon = new Date(v.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return isActive && isExpiringSoon
  }).length

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
          <div className="flex items-center justify-between mb-8">
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

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
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
                  All time issued
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Voucher Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Gift Vouchers ({filteredVouchers.length})</CardTitle>
                  <CardDescription>
                    Track and manage gift voucher lifecycle
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedVoucher(voucher)}
                                >
                                  View Details
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
              
              {filteredVouchers.length === 0 && (
                <div className="text-center py-8">
                  <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No vouchers match your search" : "No vouchers found"}
                  </p>
                  {!searchTerm && (
                    <Link href="/vouchers/new">
                      <Button className="mt-2">
                        <Plus className="mr-2 h-4 w-4" />
                        Issue First Voucher
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