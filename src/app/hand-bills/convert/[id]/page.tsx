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
import { ArrowLeft, FileText, CheckCircle, IndianRupee, Calendar, User, Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getHandBillById, convertHandBillToSale, type HandBill } from "@/lib/hand-bills-service"
import { getStoreById } from "@/lib/store-service"
import { canEditTransaction } from "@/lib/reconciliation-service"
import { useAuth } from "@/contexts/auth-context"

// Mock data no longer needed - will fetch real data
const getTenderTypeBadge = (tenderType: string) => {
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

export default function ConvertHandBillPage() {
  const router = useRouter()
  const params = useParams()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetchingBill, setFetchingBill] = useState(true)
  const [saleId, setSaleId] = useState("")
  const [handBill, setHandBill] = useState<HandBill | null>(null)
  const [storeName, setStoreName] = useState<string>("")

  // Fetch the handbill data on mount
  useEffect(() => {
    const fetchHandBill = async () => {
      try {
        setFetchingBill(true)
        const billId = params.id as string
        const bill = await getHandBillById(billId)
        
        if (!bill) {
          toast.error("Hand bill not found")
          router.push('/hand-bills')
          return
        }
        
        setHandBill(bill)
        
        // Fetch store name if available
        if (bill.store_id) {
          const store = await getStoreById(bill.store_id)
          if (store) {
            setStoreName(store.store_name)
          }
        }
      } catch (error) {
        console.error('Error fetching hand bill:', error)
        toast.error("Failed to load hand bill")
        router.push('/hand-bills')
      } finally {
        setFetchingBill(false)
      }
    }
    
    fetchHandBill()
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
    
    if (!handBill) {
      toast.error("Hand bill data not loaded")
      return
    }
    
    setLoading(true)

    try {
      console.log('Starting conversion - Hand bill ID:', handBill.id, 'Sale ID:', saleId.toUpperCase())
      
      // Call the actual conversion service
      const result = await convertHandBillToSale(handBill.id, saleId.toUpperCase())
      console.log('Conversion result:', result)
      
      toast.success(`Hand bill ${handBill.bill_number || handBill.id} converted successfully!`)
      
      // Small delay to show success message
      setTimeout(() => {
        router.push('/hand-bills')
      }, 1000)
      
    } catch (error) {
      console.error('Error converting hand bill - Full error:', error)
      
      // Check if it's the UUID type error
      if (error instanceof Error && error.message.includes('invalid input syntax for type uuid')) {
        toast.error('Database column type issue. Please run the migration to fix converted_sale_id column type.')
      } else {
        toast.error(`Failed to convert: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  // Show loading state while fetching
  if (fetchingBill) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading hand bill...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // Handle case where handbill wasn't found
  if (!handBill) {
    return null // Will redirect in useEffect
  }

  // Check if handbill can be converted (only if it's editable)
  if (!canEditTransaction(handBill.status || 'pending', profile?.role || 'cashier')) {
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
                <h2 className="text-3xl font-bold tracking-tight">Convert Hand Bill</h2>
                <p className="text-muted-foreground">
                  This hand bill cannot be converted
                </p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Hand Bill Already {handBill.status === 'converted' ? 'Converted' : 'Cancelled'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    This hand bill has already been processed and cannot be converted again.
                  </p>
                  <Link href="/hand-bills">
                    <Button>Back to Hand Bills</Button>
                  </Link>
                </CardContent>
              </Card>
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
              <h2 className="text-3xl font-bold tracking-tight">Convert Hand Bill</h2>
              <p className="text-muted-foreground">
                Link hand bill to system sale for completion
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Hand Bill Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Hand Bill Details</CardTitle>
                    <CardDescription>
                      Review the hand bill information before conversion
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Bill Number</Label>
                      <p className="font-semibold text-lg">{handBill.bill_number}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Total Amount</Label>
                      <p className="font-semibold text-2xl text-green-600">{formatCurrency(handBill.total_amount)}</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                      <div className="mt-1">
                        {getTenderTypeBadge(handBill.tender_type)}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{handBill.customer_name}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Bill Date</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{new Date(handBill.bill_date).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversion Form */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div>
                    <CardTitle>Convert to System Sale</CardTitle>
                    <CardDescription>
                      Enter the corresponding system sale ID to complete conversion
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleConvert} className="space-y-6">
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Conversion Process</h4>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                      <li>Create the sale in your POS system with the same details</li>
                      <li>Note down the system-generated sale ID (e.g., S2025001)</li>
                      <li>Enter that sale ID below to link the hand bill</li>
                      <li>Hand bill will be marked as converted and closed</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sale_id">System Sale ID *</Label>
                    <Input
                      id="sale_id"
                      placeholder="e.g., S2025001, SALE-12345"
                      value={saleId}
                      onChange={(e) => setSaleId(e.target.value.toUpperCase())}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the sale ID generated by your POS system
                    </p>
                  </div>

                  <Separator />

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">⚠️ Important</h4>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                      <li>• Ensure the system sale matches this hand bill exactly</li>
                      <li>• Same amount: {formatCurrency(handBill.total_amount)}</li>
                      <li>• Same payment method: {handBill.tender_type.replace('_', ' ').toUpperCase()}</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Link href="/hand-bills">
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </Link>
                    <Button type="submit" disabled={loading || !saleId.trim()}>
                      {loading ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Convert Hand Bill
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