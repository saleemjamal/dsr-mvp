"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertTriangle, Banknote, Calculator, CheckCircle, IndianRupee, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import { getLatestCashCount, getCurrentAccountBalance, createCashDeposit } from "@/lib/cash-service"

interface DepositValidation {
  canDeposit: boolean
  message: string
  countedAmount: number
  currentBalance: number
  lastCountTime?: string
  variance: number
}

export default function CashDepositPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { currentStore } = useStore()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [validation, setValidation] = useState<DepositValidation | null>(null)
  
  // Form fields
  const [depositAmount, setDepositAmount] = useState("")
  const [depositSlipNumber, setDepositSlipNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [notes, setNotes] = useState("")

  // Validate deposit eligibility
  useEffect(() => {
    if (!currentStore?.id) {
      setValidation({
        canDeposit: false,
        message: "Please select a store first",
        countedAmount: 0,
        currentBalance: 0,
        variance: 0
      })
      return
    }

    const validateDeposit = async () => {
      try {
        setLoading(true)
        
        // Get latest cash count for sales drawer
        const latestCount = await getLatestCashCount(currentStore.id, 'sales_drawer')
        
        // Get current sales cash balance
        const currentBalance = await getCurrentAccountBalance(currentStore.id, 'sales_cash')
        
        if (!latestCount) {
          setValidation({
            canDeposit: false,
            message: "No cash count found. Please count cash before depositing.",
            countedAmount: 0,
            currentBalance,
            variance: 0
          })
          return
        }

        const countedAmount = latestCount.total_counted || 0
        const variance = countedAmount - currentBalance

        // Check if count is recent (within last 7 days for multi-day accumulation)
        const countTime = new Date(latestCount.counted_at)
        const daysAgo = (Date.now() - countTime.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysAgo > 7) {
          setValidation({
            canDeposit: false,
            message: `Cash count is ${daysAgo.toFixed(0)} days old. Please recount before depositing.`,
            countedAmount,
            currentBalance,
            lastCountTime: latestCount.counted_at,
            variance
          })
          return
        }

        // Warning for old counts but still allow deposit
        let warningMessage = "Ready to deposit"
        if (daysAgo > 3) {
          warningMessage = `Warning: Count is ${daysAgo.toFixed(0)} days old. Consider recounting for accuracy.`
        }

        // Check if there's cash to deposit
        if (currentBalance <= 0 && countedAmount <= 0) {
          setValidation({
            canDeposit: false,
            message: "No cash available to deposit.",
            countedAmount,
            currentBalance,
            lastCountTime: latestCount.counted_at,
            variance
          })
          return
        }

        // All checks passed
        setValidation({
          canDeposit: true,
          message: warningMessage,
          countedAmount,
          currentBalance,
          lastCountTime: latestCount.counted_at,
          variance
        })
        
        // Set default deposit amount to current balance (accumulated amount)
        setDepositAmount(currentBalance.toString())
        
      } catch (error) {
        console.error('Validation error:', error)
        toast.error('Failed to validate deposit eligibility')
      } finally {
        setLoading(false)
      }
    }

    validateDeposit()
  }, [currentStore])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentStore?.id || !validation?.canDeposit || !profile) return
    
    const amount = parseFloat(depositAmount)
    
    // Validate amount
    if (amount <= 0) {
      toast.error('Deposit amount must be greater than zero')
      return
    }
    
    if (amount > validation.countedAmount) {
      toast.error(`Cannot deposit more than counted amount (₹${validation.countedAmount})`)
      return
    }
    
    if (!depositSlipNumber.trim()) {
      toast.error('Deposit slip number is required')
      return
    }
    
    if (!bankName.trim()) {
      toast.error('Bank name is required')
      return
    }
    
    try {
      setSubmitting(true)
      
      await createCashDeposit({
        storeId: currentStore.id,
        amount,
        depositSlipNumber: depositSlipNumber.trim(),
        bankName: bankName.trim(),
        notes: notes.trim() || undefined,
        depositedBy: profile.full_name || profile.email || 'Unknown'
      })
      
      toast.success('Cash deposit recorded successfully')
      router.push('/cash-management')
      
    } catch (error) {
      console.error('Deposit error:', error)
      toast.error('Failed to record deposit')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          <div className="max-w-2xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Record Bank Deposit</h2>
              <p className="text-muted-foreground">
                Record sales cash deposit to bank account
              </p>
            </div>

            {!currentStore?.id ? (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Store Selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Please select a store before recording a deposit
                    </p>
                    <Button 
                      onClick={() => router.push('/cash-management')}
                      variant="outline"
                    >
                      Go Back to Cash Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : loading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Validating deposit eligibility...</span>
                  </div>
                </CardContent>
              </Card>
            ) : validation ? (
              <>
                {/* Validation Status Card */}
                <Card className={`mb-6 ${!validation.canDeposit ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Cash Count Status</CardTitle>
                      {validation.canDeposit ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Ready to Deposit
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Cannot Deposit
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Counted Amount</p>
                        <p className="text-xl font-bold">{formatCurrency(validation.countedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expected Amount</p>
                        <p className="text-xl font-bold">{formatCurrency(validation.currentBalance)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Variance</p>
                        <p className={`text-xl font-bold ${validation.variance === 0 ? 'text-green-600' : validation.variance > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                          {validation.variance > 0 ? '+' : ''}{formatCurrency(validation.variance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Count</p>
                        <p className="text-sm">
                          {validation.lastCountTime ? format(new Date(validation.lastCountTime), 'MMM dd, hh:mm a') : 'Never'}
                        </p>
                      </div>
                    </div>
                    
                    {!validation.canDeposit && (
                      <div className="mt-4 p-3 bg-orange-100 rounded-md">
                        <p className="text-sm text-orange-800">{validation.message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deposit Form */}
                {validation.canDeposit && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Deposit Details</CardTitle>
                      <CardDescription>
                        Enter bank deposit information
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="amount">Deposit Amount *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="pl-10"
                                placeholder="0.00"
                                required
                                max={validation.countedAmount}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Maximum: {formatCurrency(validation.countedAmount)}
                            </p>
                          </div>
                          
                          <div>
                            <Label htmlFor="slip">Deposit Slip Number *</Label>
                            <Input
                              id="slip"
                              type="text"
                              value={depositSlipNumber}
                              onChange={(e) => setDepositSlipNumber(e.target.value)}
                              placeholder="e.g., DEP123456"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="bank">Bank Name *</Label>
                          <Select value={bankName} onValueChange={setBankName} required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HDFC Bank">HDFC Bank</SelectItem>
                              <SelectItem value="ICICI Bank">ICICI Bank</SelectItem>
                              <SelectItem value="State Bank of India">State Bank of India</SelectItem>
                              <SelectItem value="Axis Bank">Axis Bank</SelectItem>
                              <SelectItem value="Kotak Mahindra Bank">Kotak Mahindra Bank</SelectItem>
                              <SelectItem value="Yes Bank">Yes Bank</SelectItem>
                              <SelectItem value="Punjab National Bank">Punjab National Bank</SelectItem>
                              <SelectItem value="Bank of Baroda">Bank of Baroda</SelectItem>
                              <SelectItem value="Canara Bank">Canara Bank</SelectItem>
                              <SelectItem value="Union Bank of India">Union Bank of India</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional information..."
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="flex-1"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Recording Deposit...
                              </>
                            ) : (
                              <>
                                <Banknote className="mr-2 h-4 w-4" />
                                Record Deposit
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/cash-management')}
                            disabled={submitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  )
}