"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Mock stores data - replace with real data from Supabase later
const mockStores = [
  { id: "1", store_code: "CBD", store_name: "CBD Store" },
  { id: "2", store_code: "FSN", store_name: "Fashion Store" },
  { id: "3", store_code: "HOME", store_name: "Home Store" },
]

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "upi", label: "UPI" },
  { value: "gift_voucher", label: "Gift Voucher" },
]

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    store_id: '',
    amount: '',
    tender_type: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.store_id || !formData.amount || !formData.tender_type) {
      toast.error("Please fill in all required fields")
      return
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    setLoading(true)

    try {
      // Simulate API call - replace with actual Supabase call later
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Creating sale:', {
        store_id: formData.store_id,
        amount: parseFloat(formData.amount),
        tender_type: formData.tender_type,
        notes: formData.notes,
        sale_date: new Date().toISOString().split('T')[0]
      })

      toast.success("Sale created successfully!")
      
      // Reset form
      setFormData({
        store_id: '',
        amount: '',
        tender_type: '',
        notes: ''
      })
      
      // Redirect to sales page
      router.push('/sales')
    } catch (error) {
      console.error('Error creating sale:', error)
      toast.error("Failed to create sale. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      {/* Main Content */}
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/sales">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Add New Sale</h2>
              <p className="text-muted-foreground">
                Record a new sales transaction
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Sale Details</CardTitle>
                <CardDescription>
                  Enter the details of the sales transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Store Selection */}
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
                          {mockStores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.store_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="h-12 text-lg"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                      />
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <Label htmlFor="payment">Payment Method *</Label>
                      <Select 
                        value={formData.tender_type} 
                        onValueChange={(value) => handleInputChange('tender_type', value)}
                      >
                        <SelectTrigger id="payment" className="h-12">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date (Auto-filled) */}
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="text"
                        value={new Date().toLocaleDateString('en-IN')}
                        disabled
                        className="h-12 bg-muted"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes about this sale..."
                      className="min-h-[80px]"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                    />
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
                    <Link href="/sales">
                      <Button type="button" variant="outline" className="w-full sm:w-auto h-12">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12">
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Sale'
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