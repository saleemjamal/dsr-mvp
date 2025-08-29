"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TenderTypeSelect } from "@/components/ui/tender-type-select"
import { ArrowLeft, ShoppingCart, IndianRupee, Package, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getSalesOrderById, updateSalesOrder, type SalesOrder } from "@/lib/sales-orders-service"
import { useStore } from "@/contexts/store-context"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { useAuth } from "@/hooks/use-auth"

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { accessibleStores, canAccessMultipleStores } = useStore()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [formData, setFormData] = useState({
    order_number: '',
    total_amount: '',
    advance_amount: '',
    tender_type: '',
    notes: ''
  })

  // Load order data on mount
  useEffect(() => {
    const loadOrder = async () => {
      try {
        setPageLoading(true)
        
        // Add timeout to prevent indefinite loading
        const timeoutId = setTimeout(() => {
          toast.error('Loading timed out. Please refresh the page.')
          setPageLoading(false)
        }, 10000) // 10 second timeout
        
        const orderData = await getSalesOrderById(orderId)
        clearTimeout(timeoutId)
        
        if (!orderData) {
          toast.error('Sales order not found')
          router.push('/orders')
          return
        }
        
        setOrder(orderData)
        setFormData({
          order_number: orderData.order_number || '',
          total_amount: orderData.total_amount?.toString() || '',
          advance_amount: orderData.advance_amount?.toString() || '0',
          tender_type: orderData.tender_type || '',
          notes: orderData.notes || ''
        })
      } catch (error) {
        console.error('Error loading order:', error)
        toast.error('Failed to load order data')
        router.push('/orders')
      } finally {
        setPageLoading(false)
      }
    }

    if (orderId) {
      loadOrder()
    }
  }, [orderId, router])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors = []
    
    if (!formData.order_number.trim()) {
      errors.push("Order number is required")
    }
    
    const totalAmount = parseFloat(formData.total_amount || '0')
    if (totalAmount <= 0) {
      errors.push("Total amount must be greater than zero")
    }
    
    const advanceAmount = parseFloat(formData.advance_amount || '0')
    if (advanceAmount > totalAmount) {
      errors.push("Advance amount cannot exceed total order amount")
    }
    
    if (advanceAmount > 0 && !formData.tender_type) {
      errors.push("Payment method is required when advance amount is provided")
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
      return
    }
    
    setLoading(true)

    try {
      const totalAmount = parseFloat(formData.total_amount || '0')
      const advanceAmount = parseFloat(formData.advance_amount || '0')
      
      const updates = {
        order_number: formData.order_number.toUpperCase(),
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        ...(advanceAmount > 0 && formData.tender_type && { tender_type: formData.tender_type }),
        notes: formData.notes || undefined
      }

      await updateSalesOrder(orderId, updates)
      
      toast.success(`Sales order ${formData.order_number.toUpperCase()} updated successfully!`)
      
      setTimeout(() => {
        router.push('/orders')
      }, 1000)
      
    } catch (error) {
      console.error('Error updating sales order:', error)
      toast.error("Failed to update order. Please try again.")
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

  const totalAmount = parseFloat(formData.total_amount || '0')
  const advanceAmount = parseFloat(formData.advance_amount || '0')
  const balanceAmount = totalAmount - advanceAmount

  if (pageLoading) {
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
              <span className="ml-2">Loading order...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  // Check if user can edit this transaction
  const canEdit = canEditTransaction(order.status || 'pending', profile?.role || 'cashier')

  if (!canEdit) {
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
                <h2 className="text-3xl font-bold tracking-tight">Sales Order</h2>
                <p className="text-muted-foreground">
                  View order details for {order.customer_name}
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Cannot Edit Order</h3>
                <p className="text-muted-foreground mb-4">
                  This order cannot be edited because it has been {order.status === 'reconciled' ? 'reconciled' : 'completed'}.
                  Only pending orders can be modified.
                </p>
                <div className="bg-muted p-4 rounded-lg max-w-md mx-auto">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Order Number:</span>
                      <span className="font-medium">{order.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-medium capitalize">{order.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">{formatCurrency(order.total_amount)}</span>
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
              <h2 className="text-3xl font-bold tracking-tight">Edit Sales Order</h2>
              <p className="text-muted-foreground">
                Update order details for {order.customer_name}
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Order Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Order Information</CardTitle>
                      <CardDescription>
                        Update order number and amount
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="order_number">Order Number *</Label>
                      <Input
                        id="order_number"
                        placeholder="e.g., SO2025001"
                        value={formData.order_number}
                        onChange={(e) => handleInputChange('order_number', e.target.value.toUpperCase())}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="total_amount">Total Amount (₹) *</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="total_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData.total_amount}
                          onChange={(e) => handleInputChange('total_amount', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Info - Read Only */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Customer Name</Label>
                      <div className="p-2 bg-muted rounded text-sm">
                        {order.customer_name}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Customer Phone</Label>
                      <div className="p-2 bg-muted rounded text-sm">
                        {order.customer_phone || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment & Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <IndianRupee className="h-5 w-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <CardTitle>Payment & Summary</CardTitle>
                      <CardDescription>
                        Update advance payment and order total
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="advance_amount">Advance Payment (₹)</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="advance_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalAmount || undefined}
                          placeholder="0.00"
                          value={formData.advance_amount}
                          onChange={(e) => handleInputChange('advance_amount', e.target.value)}
                          className={`pl-10 ${advanceAmount > totalAmount && totalAmount > 0 ? 'border-red-500 focus:border-red-500' : ''}`}
                        />
                      </div>
                      {advanceAmount > totalAmount && totalAmount > 0 && (
                        <p className="text-xs text-red-600">
                          Advance amount cannot exceed total amount ({formatCurrency(totalAmount)})
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Amount paid in advance (optional)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <TenderTypeSelect
                        value={formData.tender_type}
                        onValueChange={(value) => handleInputChange('tender_type', value)}
                        label="Payment Method"
                        placeholder="Select if advance paid"
                        required={false}
                        disabled={!formData.advance_amount || parseFloat(formData.advance_amount || '0') === 0}
                      />
                      <p className="text-xs text-muted-foreground">
                        Required only if advance payment is made
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span>Total Amount:</span>
                          <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Advance Paid:</span>
                          <span className="text-green-600">{formatCurrency(advanceAmount)}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="font-medium">Balance Due:</span>
                          <span className="font-bold text-red-600">{formatCurrency(balanceAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about the order..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Order Status</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Current status: <span className="font-semibold">{order.status?.toUpperCase()}</span></li>
                  <li>• Only pending orders can be edited</li>
                  <li>• Order status can be updated from the orders list</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/orders">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || totalAmount <= 0}>
                  {loading ? (
                    <>
                      <Package className="mr-2 h-4 w-4 animate-spin" />
                      Updating Order...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Update Order
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}