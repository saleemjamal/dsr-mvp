"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Clock, ArrowRight, IndianRupee, User, Calendar, FileText, Edit } from "lucide-react"
import { toast } from "sonner"

// Mock pending approvals data
const mockPendingApprovals = [
  {
    id: "1",
    type: "transfer",
    title: "Cash Transfer Request",
    requestedAmount: 5000,
    currentBalances: { salesCash: 15050, pettyCash: 1800 },
    reason: "Petty cash running low for daily operations and change fund replenishment",
    requestedBy: "Manager A",
    requestDate: "2025-01-22T09:30:00Z",
    priority: "high"
  },
  {
    id: "2", 
    type: "transfer",
    title: "Cash Transfer Request",
    requestedAmount: 2000,
    currentBalances: { salesCash: 15050, pettyCash: 1800 },
    reason: "Change fund replenishment for weekend operations",
    requestedBy: "Manager B", 
    requestDate: "2025-01-22T14:20:00Z",
    priority: "medium"
  },
  {
    id: "3",
    type: "expense",
    title: "Expense Approval", 
    amount: 750,
    category: "Office Supplies",
    description: "Printer cartridges and stationery",
    requestedBy: "Store Assistant",
    requestDate: "2025-01-22T11:45:00Z",
    priority: "low"
  }
]

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(mockPendingApprovals)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [loading, setLoading] = useState("")
  const [approvalData, setApprovalData] = useState({
    approvedAmount: '',
    notes: ''
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: { variant: "destructive" as const, text: "High Priority" },
      medium: { variant: "secondary" as const, text: "Medium" },
      low: { variant: "outline" as const, text: "Low Priority" }
    }
    
    const config = variants[priority as keyof typeof variants]
    return <Badge variant={config.variant}>{config.text}</Badge>
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      transfer: { variant: "default" as const, text: "Transfer", icon: ArrowRight },
      expense: { variant: "secondary" as const, text: "Expense", icon: FileText }
    }
    
    const config = variants[type as keyof typeof variants]
    const IconComponent = config.icon
    
    return (
      <Badge variant={config.variant}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject', modifiedAmount?: number) => {
    setLoading(approvalId)

    try {
      await new Promise(resolve => setTimeout(resolve, 1500))

      const approval = approvals.find(a => a.id === approvalId)
      if (!approval) return

      const actionData = {
        approvalId,
        action,
        originalAmount: approval.type === 'transfer' ? approval.requestedAmount : approval.amount,
        approvedAmount: modifiedAmount || (approval.type === 'transfer' ? approval.requestedAmount : approval.amount),
        notes: approvalData.notes,
        approvedBy: 'current-aic-user', // TODO: Get from auth context
        approvedAt: new Date().toISOString()
      }

      console.log('Processing approval:', actionData)
      
      // Remove from pending list
      setApprovals(prev => prev.filter(a => a.id !== approvalId))
      
      if (action === 'approve') {
        const amountText = modifiedAmount && modifiedAmount !== (approval.type === 'transfer' ? approval.requestedAmount : approval.amount) 
          ? `${formatCurrency(modifiedAmount)} (modified from ${formatCurrency(approval.type === 'transfer' ? approval.requestedAmount : approval.amount)})`
          : formatCurrency(approval.type === 'transfer' ? approval.requestedAmount : approval.amount)
        
        toast.success(`${approval.type === 'transfer' ? 'Transfer' : 'Expense'} approved for ${amountText}`)
      } else {
        toast.success(`${approval.type === 'transfer' ? 'Transfer' : 'Expense'} request rejected`)
      }

      // Reset form
      setApprovalData({ approvedAmount: '', notes: '' })
      setSelectedApproval(null)

    } catch (error) {
      toast.error("Failed to process approval. Please try again.")
    } finally {
      setLoading("")
    }
  }

  const handleModifyAndApprove = async (approvalId: string) => {
    const modifiedAmount = parseFloat(approvalData.approvedAmount)
    if (isNaN(modifiedAmount) || modifiedAmount <= 0) {
      toast.error("Please enter a valid approved amount")
      return
    }

    await handleApproval(approvalId, 'approve', modifiedAmount)
  }

  const transferApprovals = approvals.filter(a => a.type === 'transfer')
  const expenseApprovals = approvals.filter(a => a.type === 'expense')

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
              <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
              <p className="text-muted-foreground">
                Review and approve pending transfer requests and expenses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {approvals.length} Pending
              </Badge>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Transfers</CardTitle>
                <ArrowRight className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{transferApprovals.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(transferApprovals.reduce((sum, t) => sum + t.requestedAmount, 0))} total requested
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expense Approvals</CardTitle>
                <FileText className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{expenseApprovals.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(expenseApprovals.reduce((sum, e) => sum + e.amount, 0))} total amount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <Clock className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {approvals.filter(a => a.priority === 'high').length}
                </div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals */}
          <div className="space-y-4">
            {approvals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No pending approvals at this time.</p>
                </CardContent>
              </Card>
            ) : (
              approvals.map((approval) => (
                <Card key={approval.id} className={approval.priority === 'high' ? 'border-red-200' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTypeBadge(approval.type)}
                        <div>
                          <CardTitle className="text-lg">{approval.title}</CardTitle>
                          <CardDescription>
                            Requested by {approval.requestedBy} • {new Date(approval.requestDate).toLocaleDateString('en-IN')}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(approval.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      
                      {/* Transfer-specific content */}
                      {approval.type === 'transfer' && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                            <div>
                              <p className="text-sm font-medium">Requested Amount</p>
                              <p className="text-lg font-bold text-orange-600">
                                {formatCurrency(approval.requestedAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Sales Cash Available</p>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrency(approval.currentBalances.salesCash)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Current Petty Cash</p>
                              <p className="text-lg font-bold text-blue-600">
                                {formatCurrency(approval.currentBalances.pettyCash)}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">After Transfer</h4>
                            <div className="flex items-center justify-between text-sm">
                              <span>Sales Cash: {formatCurrency(approval.currentBalances.salesCash - approval.requestedAmount)}</span>
                              <ArrowRight className="h-4 w-4 text-blue-600" />
                              <span>Petty Cash: {formatCurrency(approval.currentBalances.pettyCash + approval.requestedAmount)}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Expense-specific content */}
                      {approval.type === 'expense' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Amount</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(approval.amount)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Category</p>
                            <p className="font-medium">{approval.category}</p>
                          </div>
                        </div>
                      )}

                      {/* Reason/Description */}
                      <div>
                        <p className="text-sm font-medium mb-2">
                          {approval.type === 'transfer' ? 'Reason for Transfer' : 'Description'}
                        </p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {approval.type === 'transfer' ? approval.reason : approval.description}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => handleApproval(approval.id, 'reject')}
                          disabled={loading === approval.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>

                        <Button
                          onClick={() => handleApproval(approval.id, 'approve')}
                          disabled={loading === approval.id}
                        >
                          {loading === approval.id ? (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>

                        {approval.type === 'transfer' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="secondary"
                                onClick={() => {
                                  setSelectedApproval(approval)
                                  setApprovalData({ 
                                    approvedAmount: approval.requestedAmount.toString(), 
                                    notes: '' 
                                  })
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Modify & Approve
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Modify Transfer Amount</DialogTitle>
                                <DialogDescription>
                                  Adjust the transfer amount and add approval notes
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="approved_amount">Approved Amount</Label>
                                  <div className="relative">
                                    <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      id="approved_amount"
                                      type="number"
                                      placeholder={approval.requestedAmount.toString()}
                                      value={approvalData.approvedAmount}
                                      onChange={(e) => setApprovalData(prev => ({ ...prev, approvedAmount: e.target.value }))}
                                      className="pl-10"
                                    />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Originally requested: {formatCurrency(approval.requestedAmount)}
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="approval_notes">Approval Notes</Label>
                                  <Textarea
                                    id="approval_notes"
                                    placeholder="Reason for amount modification..."
                                    value={approvalData.notes}
                                    onChange={(e) => setApprovalData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="min-h-[80px]"
                                  />
                                </div>

                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setSelectedApproval(null)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={() => handleModifyAndApprove(approval.id)}>
                                    Approve Modified Amount
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}