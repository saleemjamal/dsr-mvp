"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Clock, ArrowRight, IndianRupee, User, Calendar, Loader2, Edit } from "lucide-react"
import { toast } from "sonner"
import { getPendingApprovals, approveTransfer, rejectTransfer, type CashTransfer } from "@/lib/cash-service"
import { useAuth } from "@/hooks/use-auth"

export default function ApprovalsPage() {
  const { profile } = useAuth()
  const [transfers, setTransfers] = useState<CashTransfer[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<CashTransfer | null>(null)
  const [loading, setLoading] = useState("")
  const [initialLoading, setInitialLoading] = useState(false)
  const [approvalData, setApprovalData] = useState({
    approvedAmount: '',
    notes: ''
  })

  // Load pending transfers
  useEffect(() => {
    const loadTransfers = async () => {
      try {
        setInitialLoading(true)
        const data = await getPendingApprovals()
        setTransfers(data)
      } catch (error) {
        console.error('Error loading pending approvals:', error)
        toast.error('Failed to load pending approvals')
      } finally {
        setInitialLoading(false)
      }
    }

    loadTransfers()
  }, [])

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

  const handleApproval = async (transferId: string, action: 'approve' | 'reject', modifiedAmount?: number) => {
    setLoading(transferId)

    try {
      const transfer = transfers.find(t => t.id === transferId)
      if (!transfer) return

      if (action === 'approve') {
        const approvedAmount = modifiedAmount || transfer.requested_amount
        await approveTransfer(transferId, approvedAmount, approvalData.notes)
        
        const amountText = modifiedAmount && modifiedAmount !== transfer.requested_amount 
          ? `${formatCurrency(modifiedAmount)} (modified from ${formatCurrency(transfer.requested_amount)})`
          : formatCurrency(transfer.requested_amount)
        
        toast.success(`Cash transfer approved for ${amountText}`)
      } else {
        await rejectTransfer(transferId, approvalData.notes || 'Request rejected')
        toast.success('Cash transfer request rejected')
      }
      
      // Remove from pending list
      setTransfers(prev => prev.filter(t => t.id !== transferId))
      
      // Reset form
      setApprovalData({ approvedAmount: '', notes: '' })
      setSelectedTransfer(null)

    } catch (error) {
      toast.error("Failed to process approval. Please try again.")
    } finally {
      setLoading("")
    }
  }

  const handleModifyAndApprove = async (transferId: string) => {
    const modifiedAmount = parseFloat(approvalData.approvedAmount)
    if (isNaN(modifiedAmount) || modifiedAmount <= 0) {
      toast.error("Please enter a valid approved amount")
      return
    }

    await handleApproval(transferId, 'approve', modifiedAmount)
  }

  // Check if user is Super User
  if (profile?.role !== 'super_user') {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <Card>
              <CardContent className="text-center py-8">
                <XCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">
                  Only Super Users can access the approvals page.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

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
              <h2 className="text-3xl font-bold tracking-tight">Cash Transfer Approvals</h2>
              <p className="text-muted-foreground">
                Review and approve pending cash transfer requests from stores
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                <Clock className="h-3 w-3 mr-1" />
                {transfers.length} Pending
              </Badge>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <ArrowRight className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{transfers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(transfers.reduce((sum, t) => sum + t.requested_amount, 0))} total requested
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
                  {transfers.filter(t => t.priority === 'high').length}
                </div>
                <p className="text-xs text-muted-foreground">Requires immediate attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                <IndianRupee className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {transfers.length > 0 
                    ? formatCurrency(transfers.reduce((sum, t) => sum + t.requested_amount, 0) / transfers.length)
                    : formatCurrency(0)
                  }
                </div>
                <p className="text-xs text-muted-foreground">Per request</p>
              </CardContent>
            </Card>
          </div>

          {initialLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading pending transfers...</p>
              </CardContent>
            </Card>
          ) : transfers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">No pending transfer requests at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => (
                <Card key={transfer.id} className={transfer.priority === 'high' ? 'border-red-200' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="default">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Cash Transfer
                        </Badge>
                        <div>
                          <CardTitle className="text-lg">Cash Transfer Request</CardTitle>
                          <CardDescription>
                            Requested by {transfer.requested_by} • {transfer.request_date ? new Date(transfer.request_date).toLocaleDateString('en-IN') : 'Recently'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(transfer.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Requested Amount</p>
                          <p className="text-lg font-bold text-orange-600">
                            {formatCurrency(transfer.requested_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Sales Cash Balance</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(transfer.sales_cash_balance || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Petty Cash Balance</p>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(transfer.petty_cash_balance || 0)}
                          </p>
                        </div>
                      </div>

                      {(transfer.sales_cash_balance || transfer.petty_cash_balance) && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">After Transfer</h4>
                          <div className="flex items-center justify-between text-sm">
                            <span>Sales Cash: {formatCurrency((transfer.sales_cash_balance || 0) - transfer.requested_amount)}</span>
                            <ArrowRight className="h-4 w-4 text-blue-600" />
                            <span>Petty Cash: {formatCurrency((transfer.petty_cash_balance || 0) + transfer.requested_amount)}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium mb-2">Reason for Transfer</p>
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                          {transfer.reason}
                        </p>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => handleApproval(transfer.id!, 'reject')}
                          disabled={loading === transfer.id}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>

                        <Button
                          onClick={() => handleApproval(transfer.id!, 'approve')}
                          disabled={loading === transfer.id}
                        >
                          {loading === transfer.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </>
                          )}
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="secondary"
                              onClick={() => {
                                setSelectedTransfer(transfer)
                                setApprovalData({ 
                                  approvedAmount: transfer.requested_amount.toString(), 
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
                                    placeholder={transfer.requested_amount.toString()}
                                    value={approvalData.approvedAmount}
                                    onChange={(e) => setApprovalData(prev => ({ ...prev, approvedAmount: e.target.value }))}
                                    className="pl-10"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Originally requested: {formatCurrency(transfer.requested_amount)}
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
                                <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={() => handleModifyAndApprove(transfer.id!)}>
                                  Approve Modified Amount
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}