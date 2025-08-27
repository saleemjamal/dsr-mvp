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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CustomerLookup } from "@/components/ui/customer-lookup"
import { TenderTypeSelect } from "@/components/ui/tender-type-select"
import { ArrowLeft, ShoppingCart, Calendar, IndianRupee, Package, Receipt } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { createSalesOrder, generateOrderNumber } from "@/lib/sales-orders-service"
import { createCustomer } from "@/lib/customer-service"
import { useStore } from "@/contexts/store-context"

export default function NewOrderPage() {
  const router = useRouter()
  const { currentStore, accessibleStores, canAccessMultipleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [formData, setFormData] = useState({
    store_id: currentStore?.id || accessibleStores[0]?.id || '',
    order_number: '',
    delivery_date: '',
    total_amount: '',
    advance_amount: '',
    tender_type: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }





  const validateForm = () => {
    const errors = []
    
    if (!formData.store_id) {
      errors.push("Store selection is required")
    }
    
    if (!formData.order_number.trim()) {
      errors.push("Order number is required")
    }
    
    console.log('Validating customer:', customer)
    if (!customer || !customer.id) {
      console.log('Customer validation failed - customer:', customer)
      errors.push("Customer information is required")
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
      let customerId = customer.id
      
      if (!customerId && customer.name && customer.phone) {
        const newCustomer = await createCustomer({
          customer_name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined
        })
        customerId = newCustomer.id
      }

      const totalAmount = parseFloat(formData.total_amount || '0')
      const advanceAmount = parseFloat(formData.advance_amount || '0')
      
      const orderData = {
        store_id: formData.store_id,
        order_number: formData.order_number.toUpperCase(),
        customer_id: customerId,
        customer_name: customer.name,
        customer_phone: customer.phone,
        items_description: 'Sales order items', // Simple placeholder since items aren't detailed yet
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        ...(advanceAmount > 0 && formData.tender_type && { tender_type: formData.tender_type }),
        status: 'pending' as const,
        notes: formData.notes || undefined
      }

      await createSalesOrder(orderData)
      
      toast.success(`Sales order ${formData.order_number.toUpperCase()} created successfully!`)
      
      setTimeout(() => {
        router.push('/orders')
      }, 1000)
      
    } catch (error) {
      console.error('Error creating sales order:', error)
      toast.error("Failed to create order. Please try again.")
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

  const generateOrderNumber = () => {
    const currentYear = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const suggested = `SO${currentYear}${randomNum}`
    handleInputChange('order_number', suggested)
  }

  const setDefaultDelivery = () => {
    const oneWeekFromNow = new Date()
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
    const formattedDate = oneWeekFromNow.toISOString().split('T')[0]
    handleInputChange('delivery_date', formattedDate)
  }

  const totalAmount = parseFloat(formData.total_amount || '0')
  const advanceAmount = parseFloat(formData.advance_amount || '0')
  const balanceAmount = totalAmount - advanceAmount

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
              <h2 className="text-3xl font-bold tracking-tight">Create Sales Order</h2>
              <p className="text-muted-foreground">
                Create a new sales order for customer delivery
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Order Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>Order Information</CardTitle>
                      <CardDescription>
                        Order number, amount, and customer information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Store Selection - Only show dropdown for multi-store users */}
                  {canAccessMultipleStores ? (
                    <div className="space-y-2">
                      <Label htmlFor="store">Store *</Label>
                      <Select 
                        value={formData.store_id} 
                        onValueChange={(value) => handleInputChange('store_id', value)}
                      >
                        <SelectTrigger id="store" className="h-12">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {accessibleStores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.store_name} ({store.store_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    /* Single store users - Show current store as read-only */
                    <div className="space-y-2">
                      <Label htmlFor="store">Store</Label>
                      <div className="h-12 px-3 py-2 border border-input bg-muted rounded-md flex items-center">
                        <span className="text-sm">
                          {currentStore ? `${currentStore.store_name} (${currentStore.store_code})` : 'Loading...'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="order_number">Order Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="order_number"
                          placeholder="e.g., SO2025001"
                          value={formData.order_number}
                          onChange={(e) => handleInputChange('order_number', e.target.value.toUpperCase())}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateOrderNumber}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </div>
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
                      <p className="text-xs text-muted-foreground">
                        Total order value
                      </p>
                    </div>
                  </div>

                  <CustomerLookup 
                    onCustomerSelect={setCustomer}
                    allowNewCustomer={true}
                  />
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
                        Advance payment and order total
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
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Order Information</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Order will be created in "Pending" status</li>
                  <li>• Balance payment can be collected on delivery</li>
                  <li>• Order status can be updated from the orders list</li>
                  <li>• Item details will be managed when item master is implemented</li>
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
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create Order
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