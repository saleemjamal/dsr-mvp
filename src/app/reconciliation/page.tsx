"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { CheckCircle, Clock, Search, Filter, Eye, FileText, IndianRupee, Calendar, Loader2, AlertTriangle, Image, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { hasPermission, Permission } from "@/lib/permissions"
import {
  getPendingTransactionsForDate,
  reconcileTransaction,
  reconcileMultipleTransactions,
  getReconciliationSummary,
  type PendingTransaction,
  type ReconciliationData
} from "@/lib/reconciliation-service"
import { toast } from "sonner"

const getTransactionTypeColor = (type: string) => {
  const colors = {
    sale: "bg-green-100 text-green-800",
    expense: "bg-red-100 text-red-800", 
    return: "bg-orange-100 text-orange-800",
    hand_bill: "bg-blue-100 text-blue-800",
    gift_voucher: "bg-purple-100 text-purple-800",
    sales_order: "bg-pink-100 text-pink-800"
  } as const

  return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
}

const getTransactionTypeIcon = (type: string) => {
  const icons = {
    sale: IndianRupee,
    expense: FileText,
    return: AlertTriangle,
    hand_bill: FileText,
    gift_voucher: IndianRupee,
    sales_order: IndianRupee
  }

  return icons[type as keyof typeof icons] || FileText
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export default function ReconciliationPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([])
  const [transactions, setTransactions] = useState<PendingTransaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [summary, setSummary] = useState<any>(null)

  // Single transaction reconciliation dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<PendingTransaction | null>(null)
  const [reconciliationSource, setReconciliationSource] = useState<'bank' | 'erp' | 'cash' | 'voucher' | 'none'>('none')
  const [reconciliationNotes, setReconciliationNotes] = useState("")
  const [externalReference, setExternalReference] = useState("")

  // Check permissions
  const canReconcile = profile && hasPermission(profile.role, Permission.RECONCILE_TRANSACTIONS)
  const canView = profile && hasPermission(profile.role, Permission.VIEW_RECONCILIATION)

  useEffect(() => {
    if (canView) {
      loadPendingTransactions()
      loadReconciliationSummary()
    }
  }, [selectedDate, selectedStoreIds, canView])

  const loadPendingTransactions = async () => {
    if (!profile || !accessibleStores) return

    try {
      setLoading(true)
      const storeFilter = selectedStoreIds.length > 0 
        ? selectedStoreIds 
        : accessibleStores.map(store => store.id)
      
      const pendingTransactions = await getPendingTransactionsForDate(selectedDate, storeFilter)
      setTransactions(pendingTransactions)
    } catch (error) {
      console.error('Error loading pending transactions:', error)
      toast.error('Failed to load pending transactions')
    } finally {
      setLoading(false)
    }
  }

  const loadReconciliationSummary = async () => {
    if (!profile || !accessibleStores) return

    try {
      const storeFilter = selectedStoreIds.length > 0 
        ? selectedStoreIds 
        : accessibleStores.map(store => store.id)
      
      const summaryData = await getReconciliationSummary(selectedDate, selectedDate, storeFilter)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error loading reconciliation summary:', error)
    }
  }

  const handleQuickReconcile = async (transaction: PendingTransaction) => {
    if (!profile || !canReconcile) return

    try {
      setReconciling(true)
      
      const reconciliationData: ReconciliationData = {
        reconciled_by: profile.id,
        reconciled_at: new Date().toISOString(),
        reconciliation_source: 'manual',
        reconciliation_notes: `Quick reconciliation by ${profile.full_name || profile.email}`,
        status: 'reconciled'
      }

      console.log('Quick reconciling transaction:', { id: transaction.id, type: transaction.type })
      await reconcileTransaction(transaction.id, transaction.type, reconciliationData)
      
      toast.success('Transaction marked as reconciled')
      await loadPendingTransactions()
      await loadReconciliationSummary()
    } catch (error) {
      console.error('Error reconciling transaction:', error)
      toast.error('Failed to reconcile transaction')
    } finally {
      setReconciling(false)
    }
  }

  const handleSingleReconciliation = async () => {
    if (!selectedTransaction || !profile || !canReconcile) return

    try {
      setReconciling(true)
      
      const reconciliationData: ReconciliationData = {
        reconciled_by: profile.id,
        reconciled_at: new Date().toISOString(),
        reconciliation_source: reconciliationSource === 'none' ? undefined : reconciliationSource,
        reconciliation_notes: reconciliationNotes.trim() || undefined,
        external_reference: externalReference.trim() || undefined,
        status: 'reconciled'
      }

      await reconcileTransaction(selectedTransaction.id, selectedTransaction.type, reconciliationData)
      
      toast.success('Transaction reconciled successfully')
      setSelectedTransaction(null)
      setReconciliationNotes("")
      setExternalReference("")
      await loadPendingTransactions()
      await loadReconciliationSummary()
    } catch (error) {
      console.error('Error reconciling transaction:', error)
      toast.error('Failed to reconcile transaction')
    } finally {
      setReconciling(false)
    }
  }

  const handleBatchReconciliation = async () => {
    if (!profile || !canReconcile || selectedTransactions.length === 0) return

    try {
      setReconciling(true)
      
      const reconciliationData: ReconciliationData = {
        reconciled_by: profile.id,
        reconciled_at: new Date().toISOString(),
        reconciliation_source: 'batch',
        reconciliation_notes: `Batch reconciliation on ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        status: 'reconciled'
      }

      const transactionsToReconcile = selectedTransactions.map(id => {
        const transaction = transactions.find(t => t.id === id)!
        return {
          id,
          type: transaction.type,
          reconciliationData
        }
      })

      await reconcileMultipleTransactions(transactionsToReconcile)
      
      toast.success(`${selectedTransactions.length} transactions reconciled successfully`)
      setSelectedTransactions([])
      await loadPendingTransactions()
      await loadReconciliationSummary()
    } catch (error) {
      console.error('Error batch reconciling transactions:', error)
      toast.error('Failed to reconcile selected transactions')
    } finally {
      setReconciling(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.store_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter
    return matchesSearch && matchesType
  })

  if (!canView) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access the reconciliation system.</p>
            </div>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Daily Reconciliation</h2>
              <p className="text-muted-foreground">
                Match transactions against external sources (bank, ERP, vouchers)
              </p>
            </div>
            {canReconcile && selectedTransactions.length > 0 && (
              <Button onClick={handleBatchReconciliation} disabled={reconciling}>
                {reconciling ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Reconcile Selected ({selectedTransactions.length})
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Transaction Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sale">Sales</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                      <SelectItem value="return">Returns</SelectItem>
                      <SelectItem value="hand_bill">Hand Bills</SelectItem>
                      <SelectItem value="gift_voucher">Gift Vouchers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    For {format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Reconciliation</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{summary.pendingTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Need verification
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reconciled</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{summary.reconciledTransactions}</div>
                  <p className="text-xs text-muted-foreground">
                    Completed verification
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Transactions ({filteredTransactions.length})</CardTitle>
                  <CardDescription>
                    Transactions awaiting reconciliation for {format(new Date(selectedDate), 'MMM dd, yyyy')}
                  </CardDescription>
                </div>
                {canReconcile && filteredTransactions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedTransactions.length === filteredTransactions.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTransactions(filteredTransactions.map(t => t.id))
                        } else {
                          setSelectedTransactions([])
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading transactions...</span>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {canReconcile && <TableHead className="w-12"></TableHead>}
                          <TableHead>Transaction Details</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((transaction) => {
                          const IconComponent = getTransactionTypeIcon(transaction.type)
                          return (
                            <TableRow key={transaction.id}>
                              {canReconcile && (
                                <TableCell>
                                  <Checkbox
                                    checked={selectedTransactions.includes(transaction.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedTransactions([...selectedTransactions, transaction.id])
                                      } else {
                                        setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id))
                                      }
                                    }}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <IconComponent className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium">{transaction.description}</p>
                                    {transaction.tender_type && (
                                      <p className="text-sm text-muted-foreground">
                                        Payment: {transaction.tender_type.replace('_', ' ').toUpperCase()}
                                      </p>
                                    )}
                                  </div>
                                  {/* Clickable Image for Expenses and Hand Bills */}
                                  {transaction.image_url && (transaction.type === 'expense' || transaction.type === 'hand_bill') && (
                                    <div className="ml-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <button className="relative group cursor-pointer">
                                            <img 
                                              src={transaction.image_url} 
                                              alt={`${transaction.type} image`}
                                              className="w-12 h-12 object-cover rounded border hover:border-primary transition-colors"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                              <ExternalLink className="h-3 w-3 text-white" />
                                            </div>
                                          </button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl">
                                          <DialogHeader>
                                            <DialogTitle>
                                              {transaction.type === 'expense' ? 'Expense Voucher' : 'Hand Bill'} Image
                                            </DialogTitle>
                                            <DialogDescription>
                                              {transaction.type === 'expense' 
                                                ? `Voucher image for expense: ${transaction.description}` 
                                                : `Hand bill image for: ${transaction.description}`
                                              }
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="mt-4">
                                            <img 
                                              src={transaction.image_url} 
                                              alt={`${transaction.type} image`}
                                              className="w-full h-auto rounded border max-h-[70vh] object-contain"
                                            />
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm">{transaction.store_name}</p>
                              </TableCell>
                              <TableCell>
                                <Badge className={getTransactionTypeColor(transaction.type)}>
                                  {transaction.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm">
                                      {new Date(transaction.created_at).toLocaleTimeString('en-IN', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuickReconcile(transaction)}
                                    disabled={reconciling}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {reconciling ? 'Processing...' : 'Reconcile'}
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedTransaction(transaction)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                      <DialogHeader>
                                        <DialogTitle>Transaction Details</DialogTitle>
                                        <DialogDescription>
                                          Review and reconcile this transaction
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-sm font-medium">Type</p>
                                            <Badge className={getTransactionTypeColor(transaction.type)}>
                                              {transaction.type.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium">Amount</p>
                                            <p className="text-sm font-semibold">{formatCurrency(transaction.amount)}</p>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <p className="text-sm font-medium">Description</p>
                                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                                        </div>
                                        
                                        <div>
                                          <p className="text-sm font-medium">Store</p>
                                          <p className="text-sm text-muted-foreground">{transaction.store_name}</p>
                                        </div>

                                        {canReconcile && (
                                          <>
                                            <hr />
                                            <div className="space-y-3">
                                              <h4 className="font-medium">Reconciliation</h4>
                                              <div>
                                                <label className="text-sm font-medium">Source (Optional)</label>
                                                <Select value={reconciliationSource} onValueChange={(value: any) => setReconciliationSource(value)}>
                                                  <SelectTrigger>
                                                    <SelectValue placeholder="Select source (optional)" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="none">No Source</SelectItem>
                                                    <SelectItem value="bank">Bank Statement</SelectItem>
                                                    <SelectItem value="erp">ERP System</SelectItem>
                                                    <SelectItem value="cash">Cash Count</SelectItem>
                                                    <SelectItem value="voucher">Physical Voucher</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div>
                                                <label className="text-sm font-medium">External Reference</label>
                                                <Input
                                                  placeholder="Transaction ID, receipt number, etc."
                                                  value={externalReference}
                                                  onChange={(e) => setExternalReference(e.target.value)}
                                                />
                                              </div>
                                              <div>
                                                <label className="text-sm font-medium">Notes</label>
                                                <Textarea
                                                  placeholder="Any discrepancies or notes..."
                                                  value={reconciliationNotes}
                                                  onChange={(e) => setReconciliationNotes(e.target.value)}
                                                  rows={2}
                                                />
                                              </div>
                                              <Button 
                                                onClick={handleSingleReconciliation} 
                                                disabled={reconciling}
                                                className="w-full"
                                              >
                                                {reconciling ? (
                                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                  <CheckCircle className="mr-2 h-4 w-4" />
                                                )}
                                                Reconcile Transaction
                                              </Button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {filteredTransactions.length === 0 && !loading && (
                    <div className="text-center py-8">
                      <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm || typeFilter !== 'all' 
                          ? "No transactions match your filters" 
                          : "All transactions for this date have been reconciled!"
                        }
                      </p>
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