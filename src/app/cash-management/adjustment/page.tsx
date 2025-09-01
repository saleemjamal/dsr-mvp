"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, AlertTriangle, IndianRupee, TrendingUp, TrendingDown, Wallet, Calculator, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { 
  createAdjustmentRequest, 
  getCurrentAccountBalance,
  getDefaultStore,
  type CashAdjustment 
} from "@/lib/cash-service"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"

export default function CashAdjustmentPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { currentStore, accessibleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [storeId, setStoreId] = useState<string>("")
  const [currentBalance, setCurrentBalance] = useState(0)
  const [formData, setFormData] = useState({
    adjustmentType: 'initial_setup' as CashAdjustment['adjustment_type'],
    accountType: 'petty_cash' as CashAdjustment['account_type'],
    amount: '',
    reason: '',
    priority: 'medium' as CashAdjustment['priority']
  })

  // Load store and initial balance
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true)
        
        // Use current store from context first, fallback to getDefaultStore
        let store = currentStore
        if (!store) {
          store = await getDefaultStore()
        }
        
        if (!store) {
          toast.error('No store found. Please contact administrator.')
          return
        }
        setStoreId(store.id)
        
        // Load current balance
        const balance = await getCurrentAccountBalance(store.id, formData.accountType)
        setCurrentBalance(balance)
      } catch (error) {
        toast.error('Failed to load store information')
      } finally {
        setInitialLoading(false)
      }
    }

    loadInitialData()
  }, [currentStore])

  // Reload balance when account type changes
  useEffect(() => {
    if (storeId) {
      getCurrentAccountBalance(storeId, formData.accountType)
        .then(balance => setCurrentBalance(balance))
        .catch(() => setCurrentBalance(0))
    }
  }, [formData.accountType, storeId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Auto-set priority for initial setup
    if (field === 'adjustmentType' && value === 'initial_setup') {
      setFormData(prev => ({ ...prev, priority: 'high' }))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getAdjustmentAmount = () => {
    const amount = parseFloat(formData.amount) || 0
    return formData.adjustmentType === 'loss' ? -Math.abs(amount) : Math.abs(amount)
  }

  const getBalanceAfterAdjustment = () => {
    return currentBalance + getAdjustmentAmount()
  }

  const validateForm = () => {
    const errors = []
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.push("Valid amount is required")
    }
    
    if (!formData.reason.trim()) {
      errors.push("Reason is required")
    }
    
    if (formData.reason.trim().length < 10) {
      errors.push("Please provide a detailed reason (at least 10 characters)")
    }
    
    // Check if adjustment would cause negative balance
    if (getBalanceAfterAdjustment() < 0) {
      errors.push(`This adjustment would result in a negative balance (${formatCurrency(getBalanceAfterAdjustment())})`)
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!storeId) {
      toast.error("Store information not loaded")
      return
    }
    
    if (!profile) {
      toast.error("User profile not loaded")
      return
    }
    
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
      return
    }
    
    setLoading(true)

    try {
      await createAdjustmentRequest({
        store_id: storeId,
        adjustment_type: formData.adjustmentType,
        account_type: formData.accountType,
        requested_amount: parseFloat(formData.amount),
        reason: formData.reason,
        status: 'pending',
        priority: formData.priority,
        requested_by: profile.full_name || profile.email || 'Unknown User'
      })
      
      toast.success('Adjustment request submitted for approval')
      
      setTimeout(() => {
        router.push('/cash-management')
      }, 1000)
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit adjustment request')
    } finally {
      setLoading(false)
    }
  }

  const getAdjustmentIcon = () => {
    switch (formData.adjustmentType) {
      case 'initial_setup': return <Wallet className="h-5 w-5" />
      case 'correction': return <Calculator className="h-5 w-5" />
      case 'injection': return <TrendingUp className="h-5 w-5" />
      case 'loss': return <TrendingDown className="h-5 w-5" />
    }
  }

  const getAdjustmentColor = () => {
    switch (formData.adjustmentType) {
      case 'initial_setup': return 'text-blue-600'
      case 'correction': return 'text-orange-600'
      case 'injection': return 'text-green-600'
      case 'loss': return 'text-red-600'
    }
  }

  if (initialLoading) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Loading adjustment form...</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  // Check permissions
  if (profile?.role === 'cashier') {
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
                  Only Store Managers and above can request cash adjustments.
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
          <div className="flex items-center gap-4 mb-8">
            <Link href="/cash-management">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Cash Adjustment Request</h2>
              <p className="text-muted-foreground">
                Request cash balance adjustments (requires approval)
              </p>
            </div>
          </div>

          {/* Main Form */}
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>New Adjustment Request</CardTitle>
                <CardDescription>
                  All adjustments require Super User approval before being processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Adjustment Type */}
                  <div className="space-y-2">
                    <Label htmlFor="adjustmentType">Adjustment Type *</Label>
                    <Select 
                      value={formData.adjustmentType} 
                      onValueChange={(value) => handleInputChange('adjustmentType', value)}
                    >
                      <SelectTrigger id="adjustmentType">
                        <SelectValue placeholder="Select adjustment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="initial_setup">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4" />
                            Initial Setup (New store petty cash)
                          </div>
                        </SelectItem>
                        <SelectItem value="correction">
                          <div className="flex items-center gap-2">
                            <Calculator className="h-4 w-4" />
                            Correction (Fix discrepancy)
                          </div>
                        </SelectItem>
                        <SelectItem value="injection">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Injection (Add funds)
                          </div>
                        </SelectItem>
                        <SelectItem value="loss">
                          <div className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Loss/Theft (Remove funds)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Account Type */}
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type *</Label>
                    <Select 
                      value={formData.accountType} 
                      onValueChange={(value) => handleInputChange('accountType', value)}
                    >
                      <SelectTrigger id="accountType">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petty_cash">Petty Cash</SelectItem>
                        <SelectItem value="sales_cash">Sales Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Balance Display */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Balance</span>
                      <span className="text-lg font-bold">{formatCurrency(currentBalance)}</span>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Adjustment Amount * 
                      {formData.adjustmentType === 'loss' && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (Will be deducted)
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Balance After Adjustment */}
                  {formData.amount && (
                    <div className={`p-4 rounded-lg ${
                      getBalanceAfterAdjustment() < 0 
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200' 
                        : 'bg-green-50 dark:bg-green-900/20 border border-green-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={getAdjustmentColor()}>
                            {getAdjustmentIcon()}
                          </div>
                          <span className="text-sm font-medium">Balance After Adjustment</span>
                        </div>
                        <span className={`text-lg font-bold ${
                          getBalanceAfterAdjustment() < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(getBalanceAfterAdjustment())}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={formData.priority} 
                      onValueChange={(value) => handleInputChange('priority', value)}
                      disabled={formData.adjustmentType === 'initial_setup'}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Can wait 24-48 hours</SelectItem>
                        <SelectItem value="medium">Medium - Within 24 hours</SelectItem>
                        <SelectItem value="high">High - Urgent approval needed</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.adjustmentType === 'initial_setup' && (
                      <p className="text-xs text-muted-foreground">
                        Initial setup is automatically set to high priority
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason / Description *</Label>
                    <Textarea
                      id="reason"
                      placeholder={
                        formData.adjustmentType === 'initial_setup' 
                          ? "e.g., Initial petty cash fund for Store XYZ - ₹5000"
                          : "Provide detailed explanation for this adjustment..."
                      }
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="min-h-[100px]"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Provide clear justification for audit purposes
                    </p>
                  </div>

                  {/* Warning for negative balance */}
                  {formData.amount && getBalanceAfterAdjustment() < 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This adjustment would result in a negative balance. Please reduce the amount or select a different adjustment type.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/cash-management">
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    </Link>
                    <Button 
                      type="submit" 
                      disabled={loading || (!!formData.amount && getBalanceAfterAdjustment() < 0)}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit for Approval
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Approval Process</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• All adjustments require Super User approval</p>
                <p>• You will be notified once approved/rejected</p>
                <p>• Approved adjustments are automatically processed</p>
                <p>• Complete audit trail is maintained for compliance</p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}