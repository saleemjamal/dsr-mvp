"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, ArrowRight, IndianRupee, Send, Clock, CheckCircle, XCircle, AlertTriangle, Plus } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Mock current balances
const mockBalances = {
  salesCash: 15050,
  pettyCash: 1800, // Below threshold
  threshold: 2000
}

// Mock transfer history
const mockTransfers = [
  {
    id: "1",
    requestedAmount: 5000,
    approvedAmount: 3000,
    reason: "Petty cash running low for daily operations",
    status: "approved",
    requestedBy: "Manager A",
    approvedBy: "AIC",
    requestDate: "2025-01-22T09:30:00Z",
    approvalDate: "2025-01-22T10:15:00Z",
    notes: "Reduced amount due to upcoming large deposit"
  },
  {
    id: "2",
    requestedAmount: 2000,
    approvedAmount: 2000,
    reason: "Change fund replenishment",
    status: "pending",
    requestedBy: "Manager B",
    requestDate: "2025-01-22T14:20:00Z"
  },
  {
    id: "3",
    requestedAmount: 4000,
    approvedAmount: 0,
    reason: "Additional cash for weekend operations",
    status: "rejected",
    requestedBy: "Manager A",
    approvedBy: "AIC",
    requestDate: "2025-01-21T16:45:00Z",
    approvalDate: "2025-01-21T17:00:00Z",
    notes: "Sufficient petty cash available, request unnecessary"
  }
]

export default function CashTransfersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    reason: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateRequest = () => {
    const errors = []
    
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      errors.push("Valid transfer amount is required")
    }
    
    if (amount > mockBalances.salesCash) {
      errors.push(`Transfer amount exceeds available sales cash (${formatCurrency(mockBalances.salesCash)})`)
    }
    
    if (!formData.reason.trim()) {
      errors.push("Reason for transfer is required")
    }
    
    return errors
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateRequest()
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
      return
    }
    
    setLoading(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const transferRequest = {
        id: String(Date.now()),
        requestedAmount: parseFloat(formData.amount),
        reason: formData.reason,
        status: 'pending',
        requestedBy: 'current-user-id', // TODO: Get from auth context
        requestDate: new Date().toISOString(),
        currentBalances: {
          salesCash: mockBalances.salesCash,
          pettyCash: mockBalances.pettyCash
        }
      }

      console.log('Submitting transfer request:', transferRequest)
      
      toast.success(`Transfer request for ${formatCurrency(parseFloat(formData.amount))} submitted successfully!`)
      
      // Reset form
      setFormData({ amount: '', reason: '' })
      setShowRequestForm(false)
      
    } catch (error) {
      toast.error("Failed to submit transfer request. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: Clock, text: "Pending" },
      approved: { variant: "default" as const, icon: CheckCircle, text: "Approved" },
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejected" }
    }
    
    const config = variants[status as keyof typeof variants]
    const IconComponent = config.icon
    
    return (
      <Badge variant={config.variant}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const getSuggestedAmount = () => {
    // Suggest amount to bring petty cash to ₹5000
    const targetAmount = 5000
    const currentShortfall = targetAmount - mockBalances.pettyCash
    return Math.max(currentShortfall, mockBalances.threshold - mockBalances.pettyCash)
  }

  const isPettyCashLow = mockBalances.pettyCash < mockBalances.threshold
  const pendingTransfers = mockTransfers.filter(t => t.status === 'pending')

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/cash-management">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight">Cash Transfers</h2>
              <p className="text-muted-foreground">
                Request and manage cash transfers from sales to petty cash
              </p>
            </div>
            <Button onClick={() => setShowRequestForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Request Transfer
            </Button>
          </div>

          {/* Current Balances */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Cash Available</CardTitle>
                <IndianRupee className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(mockBalances.salesCash)}</div>
                <p className="text-xs text-muted-foreground">Available for transfer</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Petty Cash Balance</CardTitle>
                <IndianRupee className={`h-4 w-4 ${isPettyCashLow ? 'text-orange-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isPettyCashLow ? 'text-orange-600' : ''}`}>
                  {formatCurrency(mockBalances.pettyCash)}
                </div>
                <p className={`text-xs ${isPettyCashLow ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {isPettyCashLow ? `Below ₹${mockBalances.threshold.toLocaleString()} threshold` : 'Sufficient balance'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingTransfers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(pendingTransfers.reduce((sum, t) => sum + t.requestedAmount, 0))} total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Low Cash Alert */}
          {isPettyCashLow && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-900 dark:text-orange-100">Low Petty Cash Alert</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Petty cash balance ({formatCurrency(mockBalances.pettyCash)}) is below the ₹{mockBalances.threshold.toLocaleString()} threshold. 
                      Consider requesting {formatCurrency(getSuggestedAmount())} to maintain operations.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-orange-600 border-orange-600"
                    onClick={() => {
                      setFormData({ 
                        amount: getSuggestedAmount().toString(), 
                        reason: 'Petty cash replenishment - below threshold' 
                      })
                      setShowRequestForm(true)
                    }}
                  >
                    Quick Request
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transfer Request Form */}
          {showRequestForm && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Send className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <CardTitle>Request Cash Transfer</CardTitle>
                    <CardDescription>
                      Transfer cash from sales drawer to petty cash fund
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-6">
                  
                  {/* Current Balances Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Sales Cash:</span>
                      <span className="font-bold text-green-600">{formatCurrency(mockBalances.salesCash)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Petty Cash:</span>
                      <span className={`font-bold ${isPettyCashLow ? 'text-orange-600' : ''}`}>
                        {formatCurrency(mockBalances.pettyCash)}
                      </span>
                    </div>
                  </div>

                  {/* Transfer Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Transfer Amount *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="100"
                        min="100"
                        max={mockBalances.salesCash}
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: ₹100</span>
                      <span>Available: {formatCurrency(mockBalances.salesCash)}</span>
                    </div>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('amount', '1000')}
                    >
                      ₹1,000
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('amount', '2000')}
                    >
                      ₹2,000
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('amount', getSuggestedAmount().toString())}
                    >
                      ₹{getSuggestedAmount().toLocaleString()} (Suggested)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInputChange('amount', '5000')}
                    >
                      ₹5,000
                    </Button>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Transfer *</Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Petty cash running low for daily operations"
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="min-h-[80px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide clear justification for the transfer request
                    </p>
                  </div>

                  {/* Transfer Flow Visualization */}
                  {formData.amount && parseFloat(formData.amount) > 0 && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Transfer Preview</h4>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-sm text-blue-700 dark:text-blue-300">Sales Cash</p>
                          <p className="font-bold">{formatCurrency(mockBalances.salesCash)}</p>
                          <p className="text-xs text-blue-600">→ {formatCurrency(mockBalances.salesCash - parseFloat(formData.amount))}</p>
                        </div>
                        <ArrowRight className="h-6 w-6 text-blue-600" />
                        <div className="text-center">
                          <p className="text-sm text-blue-700 dark:text-blue-300">Petty Cash</p>
                          <p className="font-bold">{formatCurrency(mockBalances.pettyCash)}</p>
                          <p className="text-xs text-blue-600">→ {formatCurrency(mockBalances.pettyCash + parseFloat(formData.amount))}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowRequestForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Send className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Transfer History */}
          <Card>
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
              <CardDescription>
                Recent cash transfer requests and approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell>
                          {new Date(transfer.requestDate).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(transfer.requestedAmount)}
                        </TableCell>
                        <TableCell>
                          {transfer.approvedAmount !== undefined ? (
                            <span className={transfer.approvedAmount !== transfer.requestedAmount ? 'text-orange-600 font-medium' : ''}>
                              {formatCurrency(transfer.approvedAmount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(transfer.status)}
                        </TableCell>
                        <TableCell>{transfer.requestedBy}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transfer.reason}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transfer.notes || '-'}
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