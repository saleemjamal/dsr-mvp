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
  const [saleId, setSaleId] = useState("")
  const [balanceAmount, setBalanceAmount] = useState("")
  const [balanceTenderType, setBalanceTenderType] = useState("")
  const [salesOrder, setSalesOrder] = useState<SalesOrder | null>(null)

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
        
        // Calculate and set the balance amount
        const balanceDue = orderData.total_amount - (orderData.advance_amount || 0)
        setBalanceAmount(balanceDue.toString())
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!saleId.trim()) {
      toast.error("System sale ID is required")
      return
    }
    
    if (!salesOrder) {
      toast.error("Sales order data not loaded")
      return
    }

    const balanceAmountNum = parseFloat(balanceAmount || '0')
    const balanceDue = salesOrder.total_amount - (salesOrder.advance_amount || 0)
    
    // Validation for balance payment
    if (balanceDue > 0) {
      if (balanceAmountNum <= 0) {
        toast.error("Balance payment amount is required")
        return
      }
      
      if (balanceAmountNum > balanceDue) {
        toast.error(`Balance payment cannot exceed balance due (${formatCurrency(balanceDue)})`)
        return
      }
      
      if (!balanceTenderType) {
        toast.error("Payment method is required for balance payment")
        return
      }
    }
    
    setLoading(true)

    try {
      console.log('Starting conversion - Sales Order ID:', salesOrder.id, 'Sale ID:', saleId.toUpperCase())
      
      // Prepare balance payment if there's a balance due
      const balancePayment = balanceDue > 0 && balanceAmountNum > 0 ? {
        amount: balanceAmountNum,
        tenderType: balanceTenderType
      } : undefined
      
      // Call the actual conversion service
      const result = await convertSalesOrderToSale(salesOrder.id!, saleId.toUpperCase(), balancePayment)
      console.log('Conversion result:', result)
      
      toast.success(`Sales order ${salesOrder.order_number || salesOrder.id} converted successfully!`)
      
      // Small delay to show success message
      setTimeout(() => {
        router.push('/orders')
      }, 1000)
      
    } catch (error) {
      console.error('Error converting sales order - Full error:', error)
      toast.error(`Failed to convert: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      console.log('Setting loading to false')
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

            {/* Conversion Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <CardTitle>Convert to Sale</CardTitle>
                    <CardDescription>
                      Enter the system sale ID to mark this order as delivered
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConvert} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="sale_id">System Sale ID *</Label>
                    <Input
                      id="sale_id"
                      type="text"
                      placeholder="e.g., SALE123, TXN456"
                      value={saleId}
                      onChange={(e) => setSaleId(e.target.value)}
                      required
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the sale ID from your billing system to link this order
                    </p>
                  </div>

                  {/* Balance Payment Section - Only show if there's a balance due */}
                  {salesOrder && (salesOrder.total_amount - (salesOrder.advance_amount || 0)) > 0 && (
                    <>
                      <Separator />
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-orange-500" />
                          <Label className="text-base font-medium">Balance Payment Collection</Label>
                        </div>
                        
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                          <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                            Balance Due: {formatCurrency(salesOrder.total_amount - (salesOrder.advance_amount || 0))}
                          </p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                            Please collect the balance payment from the customer before completing conversion
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="balance_amount">Balance Amount Received (₹) *</Label>
                            <div className="relative">
                              <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="balance_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={salesOrder.total_amount - (salesOrder.advance_amount || 0)}
                                placeholder="0.00"
                                value={balanceAmount}
                                onChange={(e) => setBalanceAmount(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Amount collected from customer
                            </p>
                          </div>

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
                        </div>
                      </div>
                    </>
                  )}

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Conversion Process</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Order status will be changed to "DELIVERED"</li>
                      <li>• Sale ID will be recorded for reference</li>
                      <li>• Balance payment details will be recorded</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/orders">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading || !saleId.trim()}>
                      {loading ? (
                        <>
                          <Package className="mr-2 h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Convert to Sale
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