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
import { CustomerLookup } from "@/components/ui/customer-lookup"
import { TenderTypeSelect } from "@/components/ui/tender-type-select"
import { ArrowLeft, ShoppingCart, Calendar, IndianRupee, Package, Receipt, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function NewOrderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [formData, setFormData] = useState({
    order_number: '',
    delivery_date: '',
    order_amount: '',
    advance_amount: '',
    tender_type: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }




  const validateForm = () => {
    const errors = []
    
    if (!formData.order_number.trim()) {
      errors.push("Order number is required")
    }
    
    if (!customer) {
      errors.push("Customer information is required")
    }
    
    if (!formData.delivery_date) {
      errors.push("Delivery date is required")
    } else {
      const deliveryDate = new Date(formData.delivery_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (deliveryDate < today) {
        errors.push("Delivery date cannot be in the past")
      }
    }
    
    const orderAmount = parseFloat(formData.order_amount || '0')
    if (!formData.order_amount || isNaN(orderAmount) || orderAmount <= 0) {
      errors.push("Valid order amount is required")
    }
    
    const advanceAmount = parseFloat(formData.advance_amount || '0')
    if (advanceAmount > orderAmount) {
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
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const orderAmount = parseFloat(formData.order_amount)
      const advanceAmount = parseFloat(formData.advance_amount || '0')
      
      const orderData = {
        id: String(Date.now()),
        order_number: formData.order_number.toUpperCase(),
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        total_amount: orderAmount,
        advance_paid: advanceAmount,
        balance_due: orderAmount - advanceAmount,
        status: 'pending',
        delivery_date: formData.delivery_date,
        order_date: new Date().toISOString().split('T')[0],
        tender_type: advanceAmount > 0 ? formData.tender_type : null,
        notes: formData.notes || null,
        created_at: new Date().toISOString()
      }

      console.log('Creating order:', orderData)
      
      toast.success(`Sales order ${formData.order_number.toUpperCase()} created successfully!`)
      
      setTimeout(() => {
        router.push('/orders')
      }, 1000)
      
    } catch (error) {
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

  const totalAmount = calculateTotal()
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
                        Basic order details and customer information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
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
                      <Label htmlFor="delivery_date">Delivery Date *</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="delivery_date"
                            type="date"
                            value={formData.delivery_date}
                            onChange={(e) => handleInputChange('delivery_date', e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={setDefaultDelivery}
                        >
                          1W
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expected delivery date (click 1W for 1 week from today)
                      </p>
                    </div>
                  </div>

                  <CustomerLookup 
                    onCustomerSelect={setCustomer}
                    allowNewCustomer={true}
                  />
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Package className="h-5 w-5 text-orange-600 dark:text-orange-300" />
                    </div>
                    <div>
                      <CardTitle>Order Details</CardTitle>
                      <CardDescription>
                        Enter order amount and delivery information
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                        <div className="col-span-5">
                          <Label htmlFor={`description_${item.id}`}>Item Description *</Label>
                          <Input
                            id={`description_${item.id}`}
                            placeholder="Describe the item"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Label htmlFor={`quantity_${item.id}`}>Quantity *</Label>
                          <Input
                            id={`quantity_${item.id}`}
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Label htmlFor={`rate_${item.id}`}>Rate (₹) *</Label>
                          <Input
                            id={`rate_${item.id}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.rate}
                            onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            required
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <Label>Amount</Label>
                          <div className="p-2 bg-muted rounded text-right font-medium">
                            {formatCurrency(item.amount)}
                          </div>
                        </div>
                        
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
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
                          max={totalAmount}
                          placeholder="0.00"
                          value={formData.advance_amount}
                          onChange={(e) => handleInputChange('advance_amount', e.target.value)}
                          className="pl-10"
                        />
                      </div>
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
                  <li>• Customer will be notified of delivery date</li>
                  <li>• Balance payment can be collected on delivery</li>
                  <li>• Order status can be updated from the orders list</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link href="/orders">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || totalAmount === 0}>
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