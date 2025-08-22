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
import { ArrowLeft, Gift, Calendar, IndianRupee, CreditCard, Receipt } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function NewVoucherPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customer, setCustomer] = useState(null)
  const [formData, setFormData] = useState({
    voucher_number: '',
    amount: '',
    expiry_date: '',
    tender_type: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors = []
    
    if (!formData.voucher_number.trim()) {
      errors.push("Voucher number is required")
    }
    
    const amount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(amount) || amount < 500) {
      errors.push("Amount must be at least ₹500")
    }
    
    if (!customer) {
      errors.push("Customer information is required")
    }
    
    if (!formData.tender_type) {
      errors.push("Payment method is required")
    }
    
    if (!formData.expiry_date) {
      errors.push("Expiry date is required")
    } else {
      const expiryDate = new Date(formData.expiry_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (expiryDate <= today) {
        errors.push("Expiry date must be in the future")
      }
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
      
      const voucherData = {
        id: String(Date.now()),
        voucher_number: formData.voucher_number.toUpperCase(),
        amount: parseFloat(formData.amount),
        balance: parseFloat(formData.amount),
        status: 'active',
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email || null,
        issued_date: new Date().toISOString().split('T')[0],
        expiry_date: formData.expiry_date,
        tender_type: formData.tender_type,
        notes: formData.notes || null,
        created_at: new Date().toISOString()
      }

      console.log('Creating voucher:', voucherData)
      
      toast.success(`Gift voucher ${formData.voucher_number.toUpperCase()} created successfully!`)
      
      setTimeout(() => {
        router.push('/vouchers')
      }, 1000)
      
    } catch (error) {
      toast.error("Failed to create voucher. Please try again.")
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
    handleInputChange('amount', formatted)
  }

  const generateVoucherNumber = () => {
    const currentYear = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const suggested = `GV${currentYear}${randomNum}`
    handleInputChange('voucher_number', suggested)
  }

  const formatDisplayAmount = (amount: string) => {
    const number = parseFloat(amount)
    if (isNaN(number)) return ''
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(number)
  }

  const setDefaultExpiry = () => {
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    const formattedDate = sixMonthsFromNow.toISOString().split('T')[0]
    handleInputChange('expiry_date', formattedDate)
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
            <Link href="/vouchers">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Issue Gift Voucher</h2>
              <p className="text-muted-foreground">
                Create a new gift voucher for customer purchase
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Gift className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>New Gift Voucher</CardTitle>
                    <CardDescription>
                      Fill in the details to issue a new gift voucher (Minimum ₹500)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="voucher_number">Voucher Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="voucher_number"
                          placeholder="e.g., GV2025001"
                          value={formData.voucher_number}
                          onChange={(e) => handleInputChange('voucher_number', e.target.value.toUpperCase())}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateVoucherNumber}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Manual voucher number entry or click to generate
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          min="500"
                          step="0.01"
                          placeholder="500.00"
                          value={formData.amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Minimum amount: ₹500 {formData.amount && `(${formatDisplayAmount(formData.amount)})`}
                      </p>
                    </div>
                  </div>

                  <CustomerLookup 
                    onCustomerSelect={setCustomer}
                    allowNewCustomer={true}
                  />

                  <TenderTypeSelect
                    value={formData.tender_type}
                    onValueChange={(value) => handleInputChange('tender_type', value)}
                    label="Payment Method"
                    placeholder="Select payment method"
                    required={true}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="expiry_date">Expiry Date *</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="expiry_date"
                          type="date"
                          value={formData.expiry_date}
                          onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={setDefaultExpiry}
                      >
                        6M
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Voucher validity period (click 6M for 6 months from today)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about the voucher..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Important Notes</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• Minimum voucher amount is ₹500</li>
                      <li>• Vouchers cannot be partially redeemed</li>
                      <li>• Full amount must be used in a single transaction</li>
                      <li>• No refunds or cancellations allowed</li>
                      <li>• Physical voucher will be printed for customer</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/vouchers">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <CreditCard className="mr-2 h-4 w-4 animate-spin" />
                          Creating Voucher...
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          Issue Voucher
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