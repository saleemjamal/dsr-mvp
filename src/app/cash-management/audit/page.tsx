"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowUpDown, 
  IndianRupee, 
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
  Calculator,
  Wallet,
  AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import { getAdjustmentAudit } from "@/lib/cash-service"
import { useAuth } from "@/hooks/use-auth"

interface AdjustmentAudit {
  id: string
  store_id: string
  store_name: string
  store_code: string
  adjustment_type: 'initial_setup' | 'correction' | 'injection' | 'loss'
  account_type: 'sales_cash' | 'petty_cash'
  requested_amount: number
  approved_amount?: number
  final_amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  priority: 'low' | 'medium' | 'high'
  requested_by: string
  approved_by?: string
  request_date: string
  approval_date?: string
  approval_notes?: string
  executed_at?: string
  current_balance_snapshot?: number
  approval_variance: number
  movement_id?: string
  movement_created_at?: string
}

export default function CashAdjustmentAuditPage() {
  const { profile } = useAuth()
  const [adjustments, setAdjustments] = useState<AdjustmentAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Load audit data
  useEffect(() => {
    const loadAuditData = async () => {
      try {
        setLoading(true)
        const data = await getAdjustmentAudit()
        setAdjustments(data as any)
      } catch (error) {
        console.error('Error loading audit data:', error)
        toast.error('Failed to load adjustment audit trail')
      } finally {
        setLoading(false)
      }
    }

    loadAuditData()
  }, [])

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
      rejected: { variant: "destructive" as const, icon: XCircle, text: "Rejected" },
      completed: { variant: "outline" as const, icon: CheckCircle, text: "Completed" }
    }
    
    const config = variants[status as keyof typeof variants]
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      initial_setup: { icon: Wallet, text: "Initial Setup", color: "text-blue-600" },
      correction: { icon: Calculator, text: "Correction", color: "text-orange-600" },
      injection: { icon: TrendingUp, text: "Injection", color: "text-green-600" },
      loss: { icon: TrendingDown, text: "Loss/Theft", color: "text-red-600" }
    }
    
    const config = variants[type as keyof typeof variants]
    const Icon = config.icon
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{config.text}</span>
      </div>
    )
  }

  const filteredAdjustments = adjustments
    .filter(adj => filter === 'all' || adj.status === filter)
    .sort((a, b) => {
      const dateA = new Date(a.request_date).getTime()
      const dateB = new Date(b.request_date).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })

  // Check permissions
  if (profile?.role !== 'super_user' && profile?.role !== 'accounts_incharge') {
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
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">
                  Only Super Users and Accounts Incharge can view the audit trail.
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
              <h2 className="text-3xl font-bold tracking-tight">Cash Adjustment Audit Trail</h2>
              <p className="text-muted-foreground">
                Complete history of all cash balance adjustments
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Adjustments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adjustments.length}</div>
                <p className="text-xs text-muted-foreground">
                  All time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {adjustments.filter(a => a.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Adjustments</CardTitle>
                <IndianRupee className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    adjustments
                      .filter(a => a.status === 'completed')
                      .reduce((sum, a) => sum + a.final_amount, 0)
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed adjustments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejection Rate</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {adjustments.length > 0 
                    ? Math.round((adjustments.filter(a => a.status === 'rejected').length / adjustments.length) * 100)
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  Of all requests
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Audit Table */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading audit trail...</p>
              </CardContent>
            </Card>
          ) : filteredAdjustments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Adjustments Found</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' 
                    ? 'No cash adjustments have been made yet.'
                    : `No ${filter} adjustments found.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Adjustment History</CardTitle>
                <CardDescription>
                  Showing {filteredAdjustments.length} adjustment{filteredAdjustments.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdjustments.map((adjustment) => (
                        <TableRow key={adjustment.id}>
                          <TableCell className="whitespace-nowrap">
                            {new Date(adjustment.request_date).toLocaleDateString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{adjustment.store_name}</p>
                              <p className="text-xs text-muted-foreground">{adjustment.store_code}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(adjustment.adjustment_type)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {adjustment.account_type === 'petty_cash' ? 'Petty Cash' : 'Sales Cash'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className={`font-medium ${adjustment.adjustment_type === 'loss' ? 'text-red-600' : 'text-green-600'}`}>
                                {adjustment.adjustment_type === 'loss' ? '-' : '+'}{formatCurrency(Math.abs(adjustment.final_amount))}
                              </p>
                              {adjustment.approval_variance !== 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Modified by {formatCurrency(adjustment.approval_variance)}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(adjustment.status)}</TableCell>
                          <TableCell className="text-sm">{adjustment.requested_by}</TableCell>
                          <TableCell className="text-sm">
                            {adjustment.approved_by || '-'}
                            {adjustment.approval_date && (
                              <p className="text-xs text-muted-foreground">
                                {new Date(adjustment.approval_date).toLocaleDateString('en-IN')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm truncate" title={adjustment.reason}>
                              {adjustment.reason}
                            </p>
                            {adjustment.approval_notes && (
                              <p className="text-xs text-muted-foreground truncate" title={adjustment.approval_notes}>
                                Note: {adjustment.approval_notes}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}