"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TenderTypeSelect } from "@/components/ui/tender-type-select"
import { ArrowLeft, ShoppingCart, CheckCircle, IndianRupee, Calendar, User, Package, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById, convertSalesOrderToSale, type SalesOrder } from "@/lib/sales-orders-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { useAuth } from "@/hooks/use-auth"

const getStatusBadge = (status: string) => {
  const colors = {
    pending: "bg-orange-100 text-orange-800",
    confirmed: "bg-blue-100 text-blue-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800"
  } as const

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {status.toUpperCase()}
    </span>
  )
}

const getTenderTypeBadge = (tenderType?: string) => {
  if (!tenderType) return null
  
  const colors = {
    cash: "bg-green-100 text-green-800",
    upi: "bg-blue-100 text-blue-800", 
    credit_card: "bg-purple-100 text-purple-800",
    gift_voucher: "bg-pink-100 text-pink-800",
    bank_transfer: "bg-gray-100 text-gray-800"
  } as const

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tenderType as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {tenderType.replace('_', ' ').toUpperCase()}
    </span>
  )
}

export default function ConvertSalesOrderPage() {
  const router = useRouter()
  const params = useParams()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetchingOrder, setFetchingOrder] = useState(false)
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null)
  
  // Credit Bill Form State
  const [creditBillNumber, setCreditBillNumber] = useState("")
  const [finalAmount, setFinalAmount] = useState("")
  const [balanceAmount, setBalanceAmount] = useState("")
  const [balanceTenderType, setBalanceTenderType] = useState("")
  const [varianceReason, setVarianceReason] = useState("")
  const [notes, setNotes] = useState("")
  
  // Calculated values
  const [variance, setVariance] = useState(0)
  const [variancePercentage, setVariancePercentage] = useState(0)
  const [refundAmount, setRefundAmount] = useState(0)

  // Fetch the sales order data on mount
  useEffect(() => {
    const fetchSalesOrder = async () => {
      try {
        setFetchingOrder(true)
        const orderId = params.id as string
        console.log('Fetching sales order with ID:', orderId)
        
        const orderData = await getSalesOrderById(orderId)
        
        if (!orderData) {
          console.error('Sales order not found')
          toast.error('Sales order not found')
          router.push('/orders')
          return
        }
        
        console.log('Sales order data loaded:', orderData)
        setSalesOrder(orderData)
        
        // Set initial values
        setFinalAmount(orderData.total_amount.toString())
        const balanceDue = orderData.total_amount - (orderData.advance_amount || 0)
        setBalanceAmount(balanceDue.toString())
        
        // Generate credit bill number
        const { generateCreditBillNumber } = await import('@/lib/sales-service')
        const cbNumber = await generateCreditBillNumber(orderData.store_id)
        setCreditBillNumber(cbNumber)
      } catch (error) {
        console.error('Error fetching sales order:', error)
        toast.error('Failed to load sales order')
        router.push('/orders')
      } finally {
        setFetchingOrder(false)
      }
    }

    fetchSalesOrder()
  }, [params.id, router])

  // Calculate variance whenever final amount changes
  useEffect(() => {
    if (!salesOrder) return
    
    const final = parseFloat(finalAmount || '0')
    const original = salesOrder.total_amount
    const advance = salesOrder.advance_amount || 0
    
    // Calculate variance
    const varianceAmount = final - original
    setVariance(varianceAmount)
    
    // Calculate variance percentage
    const percentage = original > 0 ? (varianceAmount / original) * 100 : 0
    setVariancePercentage(percentage)
    
    // Calculate balance/refund
    const balanceDue = final - advance
    if (balanceDue < 0) {
      setRefundAmount(Math.abs(balanceDue))
      setBalanceAmount('0')
    } else {
      setRefundAmount(0)
      setBalanceAmount(balanceDue.toString())
    }
  }, [finalAmount, salesOrder])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!creditBillNumber.trim()) {
      toast.error("Credit bill number is required")
      return
    }
    
    if (!salesOrder || !profile) {
      toast.error("Required data not loaded")
      return
    }
    
    // Check if variance exists and reason is required
    if (variance !== 0 && !varianceReason.trim()) {
      toast.error("Please provide a reason for the variance")
      return
    }
    
    // Validate tender type for balance payment
    const balanceAmountNum = parseFloat(balanceAmount || '0')
    if (balanceAmountNum > 0 && !balanceTenderType) {
      toast.error("Please select payment method for balance amount")
      return
    }
    
    setLoading(true)

    try {
      console.log('Starting credit bill conversion - SO ID:', salesOrder.id)
      
      // Import the credit bill service
      const { createCreditBillFromSO } = await import('@/lib/sales-service')
      
      // Create the credit bill
      const result = await createCreditBillFromSO({
        soId: salesOrder.id!,
        finalAmount: parseFloat(finalAmount),
        balancePaid: balanceAmountNum,
        balanceTenderType: balanceTenderType || '',
        creditBillNumber: creditBillNumber,
        varianceReason: variance !== 0 ? varianceReason : undefined,
        notes: notes || undefined,
        convertedBy: profile.id
      })
      
      console.log('Credit bill creation result:', result)
      
      if (result.refund_amount && result.refund_amount > 0) {
        toast.success(`Credit Bill ${creditBillNumber} created! Refund of ${formatCurrency(result.refund_amount)} processed.`)
      } else {
        toast.success(`Credit Bill ${creditBillNumber} created successfully!`)
      }
      
      // Small delay to show success message
      setTimeout(() => {
        router.push('/orders')
      }, 1500)
      
    } catch (error) {
      console.error('Error creating credit bill:', error)
      toast.error(`Failed to create credit bill: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (fetchingOrder) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading sales order...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!salesOrder) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Order Not Found</h3>
              <p className="text-gray-600 mb-4">The sales order you're looking for doesn't exist.</p>
              <Link href="/orders">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Orders
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Check if order can be converted (only if it's editable)
  if (!canEditTransaction(salesOrder.status || 'pending', profile?.role || 'cashier')) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="flex items-center gap-4 mb-8">
              <Link href="/orders">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Convert Sales Order</h2>
                <p className="text-muted-foreground">
                  This order cannot be converted
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Cannot Convert Order</h3>
                <p className="text-muted-foreground mb-4">
                  This sales order cannot be converted because it has been {salesOrder.status === 'reconciled' ? 'reconciled' : 'completed'}.
                  Only pending orders can be converted to sales.
                </p>
                <div className="bg-muted p-4 rounded-lg max-w-md mx-auto">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Order Number:</span>
                      <span className="font-medium">{salesOrder.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium capitalize">{salesOrder.status}</span>
                    </div>
                  </div>
                </div>
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
          <div className="flex items-center gap-4 mb-8">
            <Link href="/orders">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Convert Sales Order</h2>
              <p className="text-muted-foreground">
                Mark this sales order as delivered and link to system sale
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Sales Order Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Sales Order Details</CardTitle>
                    <CardDescription>
                      Review order information before conversion
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Order Number</Label>
                    <p className="text-lg font-semibold">{salesOrder.order_number}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(salesOrder.status || 'pending')}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{salesOrder.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{salesOrder.customer_phone}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p>{new Date(salesOrder.order_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {salesOrder.delivery_date && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Delivery Date</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p>{new Date(salesOrder.delivery_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-lg font-bold">{formatCurrency(salesOrder.total_amount)}</span>
                  </div>
                  
                  {salesOrder.advance_amount && salesOrder.advance_amount > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span>Advance Paid:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">{formatCurrency(salesOrder.advance_amount)}</span>
                          {salesOrder.tender_type && getTenderTypeBadge(salesOrder.tender_type)}
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t pt-3">
                        <span className="font-medium">Balance Due:</span>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(salesOrder.total_amount - salesOrder.advance_amount)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {salesOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                      <p className="mt-1 text-sm">{salesOrder.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Credit Bill Conversion Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <CardTitle>Convert to Credit Bill</CardTitle>
                    <CardDescription>
                      Complete the order and generate a credit bill
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConvert} className="space-y-6">
                  {/* Credit Bill Number */}
                  <div className="space-y-2">
                    <Label htmlFor="cb_number">Credit Bill Number</Label>
                    <Input
                      id="cb_number"
                      type="text"
                      value={creditBillNumber}
                      onChange={(e) => setCreditBillNumber(e.target.value)}
                      required
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-generated credit bill reference number
                    </p>
                  </div>

                  {/* Final Amount with Variance */}
                  <div className="space-y-2">
                    <Label htmlFor="final_amount">Final Bill Amount (₹) *</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="final_amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={finalAmount}
                        onChange={(e) => setFinalAmount(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                    
                    {/* Show variance if different from original */}
                    {variance !== 0 && (
                      <div className={`p-3 rounded-lg ${
                        variance > 0 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                          : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                      }`}>
                        <p className={`text-sm font-medium ${
                          variance > 0 
                            ? 'text-blue-800 dark:text-blue-300' 
                            : 'text-orange-800 dark:text-orange-300'
                        }`}>
                          Variance: {formatCurrency(Math.abs(variance))} 
                          {variance > 0 ? ' (Increased)' : ' (Decreased)'}
                          <span className="ml-2 text-xs">
                            ({variancePercentage > 0 ? '+' : ''}{variancePercentage.toFixed(1)}%)
                          </span>
                        </p>
                        <p className="text-xs mt-1 opacity-80">
                          Original amount was {formatCurrency(salesOrder?.total_amount || 0)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Variance Reason - Required if variance exists */}
                  {variance !== 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="variance_reason">Reason for Variance *</Label>
                      <Input
                        id="variance_reason"
                        type="text"
                        placeholder="e.g., Customer changed quantity, Price adjustment, etc."
                        value={varianceReason}
                        onChange={(e) => setVarianceReason(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Please explain why the final amount differs from the original order
                      </p>
                    </div>
                  )}

                  {/* Payment Section */}
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-green-500" />
                      <Label className="text-base font-medium">Payment Details</Label>
                    </div>
                    
                    {/* Show balance or refund based on calculation */}
                    {refundAmount > 0 ? (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm font-medium text-red-800 dark:text-red-300">
                          Refund Due: {formatCurrency(refundAmount)}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Customer paid {formatCurrency(salesOrder?.advance_amount || 0)} advance but final bill is only {formatCurrency(parseFloat(finalAmount || '0'))}
                        </p>
                      </div>
                    ) : balanceAmount && parseFloat(balanceAmount) > 0 ? (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Balance Due: {formatCurrency(parseFloat(balanceAmount))}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Advance paid: {formatCurrency(salesOrder?.advance_amount || 0)} | Final amount: {formatCurrency(parseFloat(finalAmount || '0'))}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-300">
                          Fully Paid
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Advance payment covers the full amount
                        </p>
                      </div>
                    )}
                    
                    {/* Balance Payment Method - Only show if balance is due */}
                    {balanceAmount && parseFloat(balanceAmount) > 0 && (
                      <div className="space-y-2">
                        <TenderTypeSelect
                          value={balanceTenderType}
                          onValueChange={(value) => setBalanceTenderType(value)}
                          label="Payment Method *"
                          placeholder="Select payment method"
                          required={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          How was the balance payment received?
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      type="text"
                      placeholder="Any additional information about this conversion"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What Will Happen</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Credit Bill #{creditBillNumber} will be created</li>
                      <li>• Sales entry will be recorded for cash management</li>
                      {variance !== 0 && <li>• Variance of {formatCurrency(Math.abs(variance))} will be tracked</li>}
                      {refundAmount > 0 && <li>• Refund of {formatCurrency(refundAmount)} will be processed</li>}
                      <li>• Order status will change to "DELIVERED"</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/orders">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading || !creditBillNumber.trim()}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Credit Bill...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Create Credit Bill
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}