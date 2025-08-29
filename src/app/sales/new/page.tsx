"use client"

import { useState, useEffect } from "react"
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
import { createMultipleSales } from "@/lib/sales-service"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import type { Store } from "@/lib/store-service"

const tenderTypes = [
  { value: "cash", label: "Cash", icon: "₹" },
  { value: "credit_card", label: "Credit Card", icon: "💳" },
  { value: "upi", label: "UPI", icon: "📱" },
  { value: "gift_voucher", label: "Gift Voucher", icon: "🎁" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
]

export default function NewSalePage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { currentStore, accessibleStores, canAccessMultipleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    store_id: currentStore?.id || '',
    tenderAmounts: {} as Record<string, string>, // Store amounts for each tender type
    notes: ''
  })

  // Set initial store when currentStore or accessibleStores change
  useEffect(() => {
    if (!canAccessMultipleStores && currentStore) {
      // Single store users: auto-select their assigned store
      setFormData(prev => ({ ...prev, store_id: currentStore.id }))
    } else if (canAccessMultipleStores && accessibleStores.length > 0 && !formData.store_id) {
      // Multi-store users: select first available store if none selected
      setFormData(prev => ({ ...prev, store_id: accessibleStores[0].id }))
    }
  }, [currentStore, accessibleStores, canAccessMultipleStores, formData.store_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.store_id) {
      toast.error("Please select a store")
      return
    }

    // Check if at least one tender type has an amount
    const hasAnyAmount = Object.values(formData.tenderAmounts).some(amount => 
      amount && parseFloat(amount) > 0
    )
    
    if (!hasAnyAmount) {
      toast.error("Please enter amount for at least one payment method")
      return
    }

    setLoading(true)

    try {
      // Process each tender type that has an amount
      const sales = Object.entries(formData.tenderAmounts)
        .filter(([_, amount]) => amount && parseFloat(amount) > 0)
        .map(([tenderType, amount]) => ({
          store_id: formData.store_id,
          amount: parseFloat(amount),
          tender_type: tenderType,
          notes: formData.notes,
          sale_date: new Date().toISOString().split('T')[0]
        }))

      // Save to database
      await createMultipleSales(sales)
      
      const totalAmount = sales.reduce((sum, sale) => sum + sale.amount, 0)
      toast.success(`Sales created successfully! Total: ₹${totalAmount.toLocaleString('en-IN')}`)
      
      // Reset form
      setFormData({
        store_id: '',
        tenderAmounts: {},
        notes: ''
      })
      
      // Redirect to sales page
      router.push('/sales')
    } catch (error: any) {
      console.error('Error creating sales:', error)
      toast.error(error.message || "Failed to create sales. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTenderAmountChange = (tenderType: string, value: string) => {
    // Only allow numbers and decimal point
    if (value && !/^\d*\.?\d*$/.test(value)) return
    
    setFormData(prev => ({
      ...prev,
      tenderAmounts: {
        ...prev.tenderAmounts,
        [tenderType]: value
      }
    }))
  }

  const getTotalAmount = () => {
    return Object.values(formData.tenderAmounts).reduce((sum, amount) => 
      sum + (amount ? parseFloat(amount) : 0), 0
    )
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

                  {/* Payment Method Amounts */}
                  <div className="space-y-4">
                    <div>
                      <Label>Payment Methods *</Label>
                      <p className="text-sm text-muted-foreground">Enter amounts for each payment method used</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tenderTypes.map((tender) => (
                        <div key={tender.value} className="space-y-2">
                          <Label htmlFor={tender.value}>
                            <span className="mr-2">{tender.icon}</span>
                            {tender.label}
                          </Label>
                          <Input
                            id={tender.value}
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            className="h-12 text-lg"
                            value={formData.tenderAmounts[tender.value] || ''}
                            onChange={(e) => handleTenderAmountChange(tender.value, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Total Amount Display */}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Amount:</span>
                        <span className="text-2xl font-bold">
                          ₹{getTotalAmount().toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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