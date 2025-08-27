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
import { SmartCameraCapture } from "@/components/ui/smart-camera-capture"
import { CapturedPhoto } from "@/components/ui/mobile-camera-input"
import { ArrowLeft, FileText, Calendar, IndianRupee, User, Camera } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { createHandBill } from "@/lib/hand-bills-service"
import { createCustomer } from "@/lib/customer-service"
import { useStore } from "@/contexts/store-context"
import { uploadImage, generateImagePath } from "@/lib/storage-service"

export default function NewHandBillPage() {
  const router = useRouter()
  const { currentStore, accessibleStores, canAccessMultipleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [formData, setFormData] = useState({
    store_id: currentStore?.id || accessibleStores[0]?.id || '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    total_amount: '',
    tender_type: '',
    notes: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoCapture = (photo: CapturedPhoto) => {
    setCapturedPhoto(photo)
    setShowCamera(false)
    toast.success("Hand bill image captured successfully!")
  }

  const validateForm = () => {
    const errors = []
    
    if (!formData.store_id) {
      errors.push("Store selection is required")
    }
    
    if (!formData.bill_number.trim()) {
      errors.push("Bill number is required")
    }
    
    if (!formData.bill_date) {
      errors.push("Bill date is required")
    }
    
    const amount = parseFloat(formData.total_amount)
    if (!formData.total_amount || isNaN(amount) || amount <= 0) {
      errors.push("Valid total amount is required")
    }
    
    if (!formData.tender_type) {
      errors.push("Payment method is required")
    }
    
    if (!capturedPhoto) {
      errors.push("Hand bill image is required")
    }
    
    if (capturedPhoto && !customer) {
      errors.push("Customer information is required")
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
      // Create customer if needed
      let customerId = customer.id
      
      if (!customerId && customer.name && customer.phone) {
        const newCustomer = await createCustomer({
          customer_name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined
        })
        customerId = newCustomer.id
      }

      // Upload image to storage - this is REQUIRED for handbills
      let imageUrl: string | undefined
      if (capturedPhoto?.dataUrl) {
        console.log('Uploading handbill image...')
        const imagePath = generateImagePath(formData.store_id, 'handbill')
        const uploadedUrl = await uploadImage('handbills', imagePath, capturedPhoto.dataUrl)
        
        if (!uploadedUrl) {
          // Image upload failed - abort the entire operation
          throw new Error('Image upload failed. Handbill creation requires a valid image.')
        }
        
        imageUrl = uploadedUrl
        console.log('Image uploaded successfully:', imageUrl)
      } else {
        // No image captured - this should never happen due to validation, but fail safe
        throw new Error('No image provided. Handbill creation requires an image.')
      }

      const handBillData = {
        store_id: formData.store_id,
        bill_date: formData.bill_date,
        bill_number: formData.bill_number.toUpperCase(),
        total_amount: parseFloat(formData.total_amount),
        tender_type: formData.tender_type,
        customer_name: customer.name,
        image_url: imageUrl,
        status: 'pending' as const,
        notes: formData.notes || undefined
      }

      console.log('Creating handbill record with image URL:', imageUrl)
      await createHandBill(handBillData)
      
      toast.success(`Hand bill ${formData.bill_number.toUpperCase()} created successfully!`)
      
      setTimeout(() => {
        router.push('/hand-bills')
      }, 1000)
      
    } catch (error) {
      console.error('Error creating hand bill:', error)
      toast.error("Failed to create hand bill. Please try again.")
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
    handleInputChange('total_amount', formatted)
  }

  const formatDisplayAmount = (amount: string) => {
    const number = parseFloat(amount)
    if (isNaN(number)) return ''
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(number)
  }

  if (showCamera) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="max-w-4xl mx-auto">
              <SmartCameraCapture 
                onPhotoCapture={handlePhotoCapture}
                onCancel={() => setShowCamera(false)}
              />
            </div>
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
            <Link href="/hand-bills">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Add Hand Bill</h2>
              <p className="text-muted-foreground">
                Record a manual bill when POS system fails
              </p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Hand Bill Details</CardTitle>
                    <CardDescription>
                      Enter the handwritten bill information and capture image
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
                  
                  {/* Bill Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="bill_number">Bill Number *</Label>
                      <Input
                        id="bill_number"
                        placeholder="e.g., HB001, Manual-123"
                        value={formData.bill_number}
                        onChange={(e) => handleInputChange('bill_number', e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the bill number from handwritten bill
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bill_date">Bill Date *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="bill_date"
                          type="date"
                          value={formData.bill_date}
                          onChange={(e) => handleInputChange('bill_date', e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Amount and Payment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="total_amount">Total Amount *</Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="total_amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={formData.total_amount}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formData.total_amount && `Amount: ${formatDisplayAmount(formData.total_amount)}`}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <TenderTypeSelect
                        value={formData.tender_type}
                        onValueChange={(value) => handleInputChange('tender_type', value)}
                        label="Payment Method"
                        placeholder="Select payment method"
                        required={true}
                      />
                    </div>
                  </div>

                  {/* Bill Image */}
                  <div className="space-y-2">
                    <Label>Hand Bill Image *</Label>
                    {!capturedPhoto ? (
                      <Card className="border-dashed border-2">
                        <CardContent className="p-6 text-center">
                          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-sm font-medium mb-2">No image captured</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCamera(true)}
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Capture Bill Image
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Take a clear photo of the handwritten bill
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-medium">Captured Image</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowCamera(true)}
                            >
                              Retake
                            </Button>
                          </div>
                          <img
                            src={capturedPhoto.dataUrl}
                            alt="Hand bill"
                            className="w-full h-auto rounded border max-h-64 object-contain"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Size: {capturedPhoto.sizeKB}KB • Captured: {new Date(capturedPhoto.timestamp).toLocaleTimeString()}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Customer Information - shown after image capture */}
                  {capturedPhoto && (
                    <div className="space-y-3">
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-medium mb-2">Customer Information</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Enter customer details based on the captured bill image
                        </p>
                        <CustomerLookup 
                          onCustomerSelect={setCustomer}
                          allowNewCustomer={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional information about this bill..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Important Notes</h4>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      <li>• Hand bills must be converted to system sales for proper accounting</li>
                      <li>• Take clear, legible photos for audit purposes</li>
                      <li>• Include all items and amounts exactly as written</li>
                      <li>• Convert hand bills as soon as POS system is restored</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/hand-bills">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading || !capturedPhoto}>
                      {loading ? (
                        <>
                          <FileText className="mr-2 h-4 w-4 animate-spin" />
                          Creating Hand Bill...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Create Hand Bill
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