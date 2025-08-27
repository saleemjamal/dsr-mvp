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
import { ReturnReasonSelect } from "@/components/ui/return-reason-select"
import { ArrowLeft, RotateCcw, Calendar, IndianRupee, Receipt, FileText } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { createReturn } from "@/lib/returns-service"
import { createCustomer, searchCustomers } from "@/lib/customer-service"
import { useStore } from "@/contexts/store-context"

export default function NewRRNPage() {
  const router = useRouter()
  const { currentStore, accessibleStores, canAccessMultipleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [formData, setFormData] = useState({
    store_id: currentStore?.id || accessibleStores[0]?.id || '',
    rrn_number: '',
    sales_bill_number: '',
    rrn_amount: '',
    rrn_date: new Date().toISOString().split('T')[0],
    tender_type: '',
    return_reason: '',
    remarks: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors = []
    
    if (!formData.store_id) {
      errors.push("Store selection is required")
    }
    
    if (!formData.rrn_number.trim()) {
      errors.push("RRN number is required")
    }
    
    if (!formData.sales_bill_number.trim()) {
      errors.push("Sales bill number is required")
    }
    
    const amount = parseFloat(formData.rrn_amount)
    if (!formData.rrn_amount || isNaN(amount) || amount <= 0) {
      errors.push("Valid RRN amount is required")
    }
    
    if (!customer) {
      errors.push("Customer information is required")
    }
    
    if (!formData.rrn_date) {
      errors.push("RRN date is required")
    }
    
    if (!formData.tender_type) {
      errors.push("Original payment method is required")
    }
    
    if (!formData.return_reason) {
      errors.push("Return reason is required")
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

      const returnData = {
        store_id: formData.store_id,
        return_date: formData.rrn_date,
        original_bill_reference: formData.sales_bill_number.toUpperCase(),
        return_amount: parseFloat(formData.rrn_amount),
        refund_method: formData.tender_type,
        customer_name: customer.name,
        reason: formData.return_reason,
        notes: formData.remarks || undefined
      }

      await createReturn(returnData)
      
      toast.success(`Return ${formData.sales_bill_number.toUpperCase()} processed successfully!`)
      
      setTimeout(() => {
        router.push('/returns')
      }, 1000)
      
    } catch (error) {
      console.error('Error creating return:', error)
      toast.error("Failed to create return. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const number = parseFloat(value.replace(/[^\d.]/g, ''))
    return isNaN(number) ? '' : number.toString()
  }

  const handleAmountChange = (value: string) => {
    const formatted = formatCurrency(value)
    handleInputChange('rrn_amount', formatted)
  }

  const formatDisplayAmount = (amount: string) => {
    const number = parseFloat(amount)
    if (isNaN(number)) return ''
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(number)
  }

  const generateRRNNumber = () => {
    const currentYear = new Date().getFullYear()
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const suggested = `RET${currentYear}${currentMonth}${randomNum}`
    handleInputChange('rrn_number', suggested)
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
            <Link href="/returns">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Issue Return Receipt Note</h2>
              <p className="text-muted-foreground">
                Create store credit note for customer return
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <RotateCcw className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>New RRN Details</CardTitle>
                    <CardDescription>
                      Enter return information and customer details
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
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
                  
                  {/* RRN Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="rrn_number">RRN Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="rrn_number"
                          placeholder="e.g., RET202501001"
                          value={formData.rrn_number}
                          onChange={(e) => handleInputChange('rrn_number', e.target.value.toUpperCase())}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateRRNNumber}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sales_bill_number">Original Sales Bill Number *</Label>
                      <div className="relative">
                        <Receipt className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="sales_bill_number"
                          placeholder="e.g., BILL-2025-001"
                          value={formData.sales_bill_number}
                          onChange={(e) => handleInputChange('sales_bill_number', e.target.value.toUpperCase())}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount and Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="rrn_amount">RRN Amount *</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="rrn_amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={formData.rrn_amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.rrn_amount && `Amount: ${formatDisplayAmount(formData.rrn_amount)}`}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rrn_date">RRN Date *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="rrn_date"
                          type="date"
                          value={formData.rrn_date}
                          onChange={(e) => handleInputChange('rrn_date', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <CustomerLookup 
                    onCustomerSelect={setCustomer}
                    allowNewCustomer={true}
                  />

                  {/* Payment Method and Return Reason */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TenderTypeSelect
                      value={formData.tender_type}
                      onValueChange={(value) => handleInputChange('tender_type', value)}
                      label="Original Payment Method"
                      placeholder="Select original payment method"
                      required={true}
                    />

                    <ReturnReasonSelect
                      value={formData.return_reason}
                      onValueChange={(value) => handleInputChange('return_reason', value)}
                      label="Return Reason"
                      placeholder="Select return reason"
                      required={true}
                    />
                  </div>

                  {/* Remarks */}
                  <div className="space-y-2">
                    <Label htmlFor="remarks">Remarks (Optional)</Label>
                    <Textarea
                      id="remarks"
                      placeholder="Additional details about the return..."
                      value={formData.remarks}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                      className="min-h-[80px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe the condition, specific issues, or other relevant details
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">RRN Information</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• RRN is valid for 1 year from issue date</li>
                      <li>• Full amount must be redeemed in one transaction</li>
                      <li>• No partial redemptions allowed</li>
                      <li>• RRN can be combined with other payment methods</li>
                      <li>• Store credit cannot be converted back to cash</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/returns">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                          Creating RRN...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Issue RRN
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