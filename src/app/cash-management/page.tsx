"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calculator, IndianRupee, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"

// Mock data for cash management dashboard
const mockCashData = {
  salesCash: {
    expected: 15000,
    actual: 15050,
    variance: 50,
    lastCounted: "2025-01-22T08:30:00Z"
  },
  pettyCash: {
    balance: 3200,
    lastCounted: "2025-01-22T08:45:00Z",
    lowThreshold: 2000
  },
  todayTransactions: {
    cashSales: 12500,
    cashAdvances: 2500,
    cashTransfers: 1000,
    deposits: 0
  }
}

const mockCashHistory = [
  {
    id: "1",
    date: "2025-01-22",
    type: "sales_count",
    expected: 15000,
    actual: 15050,
    variance: 50,
    countedBy: "Manager A",
    timestamp: "08:30 AM"
  },
  {
    id: "2", 
    date: "2025-01-22",
    type: "petty_count",
    actual: 3200,
    countedBy: "Manager A",
    timestamp: "08:45 AM"
  },
  {
    id: "3",
    date: "2025-01-21", 
    type: "transfer",
    amount: 3000,
    from: "sales",
    to: "petty",
    approvedBy: "AIC",
    timestamp: "02:15 PM"
  }
]

export default function CashManagementPage() {
  const [selectedDate] = useState(new Date().toISOString().split('T')[0])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getVarianceBadge = (variance: number) => {
    if (variance === 0) {
      return <Badge variant="default" className="text-green-600"><CheckCircle className="h-3 w-3 mr-1" />Perfect</Badge>
    } else if (variance > 0) {
      return <Badge variant="secondary" className="text-orange-600"><TrendingUp className="h-3 w-3 mr-1" />+{formatCurrency(variance)}</Badge>
    } else {
      return <Badge variant="destructive"><TrendingDown className="h-3 w-3 mr-1" />{formatCurrency(variance)}</Badge>
    }
  }

  const isPettyCashLow = mockCashData.pettyCash.balance < mockCashData.pettyCash.lowThreshold

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cash Management</h2>
              <p className="text-muted-foreground">
                Daily cash counting, transfers, and balance management
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/cash-management/count">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Count Cash
                </Button>
              </Link>
              <Link href="/cash-management/transfers">
                <Button variant="outline">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Transfers
                </Button>
              </Link>
            </div>
          </div>

          {/* Cash Status Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            
            {/* Sales Cash Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Cash</CardTitle>
                <Calculator className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(mockCashData.salesCash.actual)}</div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Expected: {formatCurrency(mockCashData.salesCash.expected)}
                  </p>
                  {getVarianceBadge(mockCashData.salesCash.variance)}
                </div>
              </CardContent>
            </Card>

            {/* Petty Cash Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Petty Cash</CardTitle>
                <IndianRupee className={`h-4 w-4 ${isPettyCashLow ? 'text-orange-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isPettyCashLow ? 'text-orange-600' : ''}`}>
                  {formatCurrency(mockCashData.pettyCash.balance)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isPettyCashLow ? (
                    <span className="text-orange-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Below ₹{mockCashData.pettyCash.lowThreshold.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Sufficient balance
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Today's Cash Inflow */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Inflow</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(mockCashData.todayTransactions.cashSales + mockCashData.todayTransactions.cashAdvances)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sales: {formatCurrency(mockCashData.todayTransactions.cashSales)} + 
                  Advances: {formatCurrency(mockCashData.todayTransactions.cashAdvances)}
                </p>
              </CardContent>
            </Card>

            {/* Cash Transfers Today */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transfers Out</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(mockCashData.todayTransactions.cashTransfers + mockCashData.todayTransactions.deposits)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  To Petty: {formatCurrency(mockCashData.todayTransactions.cashTransfers)} + 
                  Deposits: {formatCurrency(mockCashData.todayTransactions.deposits)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Low Cash Alert */}
          {isPettyCashLow && (
            <div className="mb-6">
              <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div>
                      <h4 className="font-medium text-orange-900 dark:text-orange-100">Low Petty Cash Alert</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300">
                        Petty cash balance ({formatCurrency(mockCashData.pettyCash.balance)}) is below the threshold of {formatCurrency(mockCashData.pettyCash.lowThreshold)}. 
                        Consider requesting a transfer from sales cash.
                      </p>
                    </div>
                    <Link href="/cash-management/transfers">
                      <Button variant="outline" size="sm" className="text-orange-600 border-orange-600">
                        Request Transfer
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Cash Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Cash Activity</CardTitle>
                  <CardDescription>
                    Latest cash counts, transfers, and transactions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Today: {selectedDate}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockCashHistory.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge variant={
                            activity.type === 'sales_count' ? 'default' :
                            activity.type === 'petty_count' ? 'secondary' : 'outline'
                          }>
                            {activity.type === 'sales_count' ? 'Sales Count' :
                             activity.type === 'petty_count' ? 'Petty Count' : 'Transfer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activity.type === 'transfer' ? (
                            <span className="capitalize">{activity.from} → {activity.to}</span>
                          ) : (
                            <span>
                              {activity.expected ? `Expected: ${formatCurrency(activity.expected)}` : 'Balance Count'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(activity.actual || activity.amount)}
                        </TableCell>
                        <TableCell>
                          {activity.variance !== undefined ? (
                            getVarianceBadge(activity.variance)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {activity.countedBy || activity.approvedBy}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {activity.timestamp}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}