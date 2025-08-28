"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Search, RotateCcw, User, Calendar, IndianRupee, Receipt, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface MockRRNRedeem {
  id: string
  rrn_number: string
  sales_bill_number: string
  rrn_amount: number
  balance: number
  tender_type: string
  customer_name: string
  customer_phone: string
  return_reason: string
  status: string
  rrn_date: string
  expiry_date: string
  remarks: string
}

const mockRRNs: MockRRNRedeem[] = [
  {
    id: "1",
    rrn_number: "RRN001",
    sales_bill_number: "BILL-2025-001",
    rrn_amount: 850.00,
    balance: 850.00,
    tender_type: "cash",
    customer_name: "Rahul Sharma",
    customer_phone: "+91 9876543001",
    return_reason: "defective",
    status: "active",
    rrn_date: "2025-01-22",
    expiry_date: "2026-01-22",
    remarks: "Shirt had a tear on the sleeve"
  },
  {
    id: "2",
    rrn_number: "RRN002", 
    sales_bill_number: "BILL-2025-002",
    rrn_amount: 1250.00,
    balance: 0.00,
    tender_type: "upi",
    customer_name: "Priya Patel",
    customer_phone: "+91 9876543002",
    return_reason: "wrong_size",
    status: "redeemed",
    rrn_date: "2025-01-21",
    expiry_date: "2026-01-21",
    remarks: "Size L needed instead of M"
  },
  {
    id: "3",
    rrn_number: "RRN003",
    sales_bill_number: "BILL-2025-003", 
    rrn_amount: 650.00,
    balance: 650.00,
    tender_type: "credit_card",
    customer_name: "Amit Kumar",
    customer_phone: "+91 9876543003",
    return_reason: "change_of_mind",
    status: "active",
    rrn_date: "2025-01-20",
    expiry_date: "2026-01-20",
    remarks: ""
  },
  {
    id: "4",
    rrn_number: "RRN004",
    sales_bill_number: "BILL-2024-999",
    rrn_amount: 400.00,
    balance: 400.00,
    tender_type: "cash",
    customer_name: "Sneha Singh",
    customer_phone: "+91 9876543004",
    return_reason: "other",
    status: "expired",
    rrn_date: "2024-03-15",
    expiry_date: "2025-03-15",
    remarks: "Customer moved to different city"
  }
]

const getReturnReasonBadge = (reason: string) => {
  const reasonLabels = {
    defective: "Defective/Damaged",
    wrong_size: "Wrong Size", 
    wrong_item: "Wrong Item",
    not_as_described: "Not as Described",
    change_of_mind: "Change of Mind",
    duplicate_order: "Duplicate Order",
    other: "Other"
  } as const

  const colors = {
    defective: "bg-red-100 text-red-800",
    wrong_size: "bg-blue-100 text-blue-800",
    wrong_item: "bg-purple-100 text-purple-800", 
    not_as_described: "bg-yellow-100 text-yellow-800",
    change_of_mind: "bg-pink-100 text-pink-800",
    duplicate_order: "bg-orange-100 text-orange-800",
    other: "bg-gray-100 text-gray-800"
  } as const

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[reason as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {reasonLabels[reason as keyof typeof reasonLabels] || reason.replace('_', ' ').toUpperCase()}
    </span>
  )
}

function RedeemRRNContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rrnNumber, setRrnNumber] = useState("")
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [rrn, setRrn] = useState<MockRRNRedeem | null>(null)
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  
  useEffect(() => {
    const rrnParam = searchParams?.get('rrn')
    if (rrnParam) {
      setRrnNumber(rrnParam)
      handleLookup(rrnParam)
    }
  }, [searchParams])

  const handleLookup = async (searchNumber?: string) => {
    const lookupNumber = searchNumber || rrnNumber
    if (!lookupNumber.trim()) {
      toast.error("Please enter an RRN number")
      return
    }

    setLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const foundRRN = mockRRNs.find(r => 
        r.rrn_number.toLowerCase() === lookupNumber.toLowerCase()
      )
      
      if (!foundRRN) {
        toast.error("RRN not found")
        setRrn(null)
        return
      }
      
      setRrn(foundRRN)
      
      if (foundRRN.status === 'expired') {
        toast.error("This RRN has expired")
      } else if (foundRRN.status === 'redeemed') {
        toast.error("This RRN has already been fully redeemed")
      } else if (new Date(foundRRN.expiry_date) <= new Date()) {
        toast.error("This RRN has expired")
      } else {
        toast.success("RRN found and ready for redemption")
      }
      
    } catch (error) {
      toast.error("Failed to lookup RRN")
      setRrn(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (!rrn) return
    
    const amount = parseFloat(purchaseAmount)
    if (!purchaseAmount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid purchase amount")
      return
    }
    
    if (amount > rrn.balance) {
      toast.error(`Purchase amount (${formatCurrency(amount)}) exceeds RRN balance (${formatCurrency(rrn.balance)})`)
      return
    }
    
    if (amount < rrn.balance) {
      toast.error("Partial redemption not allowed. Full RRN amount must be used in one transaction.")
      return
    }

    setRedeeming(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('Redeeming RRN:', {
        rrn_id: rrn.id,
        rrn_number: rrn.rrn_number,
        amount_redeemed: amount,
        remaining_balance: rrn.balance - amount,
        redeemed_at: new Date().toISOString()
      })
      
      toast.success(`RRN ${rrn.rrn_number} redeemed successfully for ${formatCurrency(amount)}!`)
      
      setTimeout(() => {
        router.push('/returns')
      }, 2000)
      
    } catch (error) {
      toast.error("Failed to redeem RRN. Please try again.")
    } finally {
      setRedeeming(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const isRRNRedeemable = rrn && 
    rrn.status === 'active' && 
    rrn.balance > 0 &&
    new Date(rrn.expiry_date) > new Date()

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
              <h2 className="text-3xl font-bold tracking-tight">Redeem RRN</h2>
              <p className="text-muted-foreground">
                Look up and redeem Return Receipt Notes for customer purchases
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* RRN Lookup */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Search className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <CardTitle>RRN Lookup</CardTitle>
                    <CardDescription>
                      Enter RRN number to verify and redeem
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="rrn_number" className="sr-only">RRN Number</Label>
                    <Input
                      id="rrn_number"
                      placeholder="Enter RRN number (e.g., RRN2025001)"
                      value={rrnNumber}
                      onChange={(e) => setRrnNumber(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                    />
                  </div>
                  <Button onClick={() => handleLookup()} disabled={loading}>
                    {loading ? (
                      <>
                        <Search className="mr-2 h-4 w-4 animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Lookup
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* RRN Details */}
            {rrn && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <RotateCcw className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>RRN Details</CardTitle>
                        <CardDescription>
                          {rrn.rrn_number} - {rrn.customer_name}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={rrn.status === 'active' ? 'default' : rrn.status === 'redeemed' ? 'secondary' : 'destructive'}>
                      {rrn.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{rrn.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{rrn.customer_phone}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">RRN Amount</p>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-lg">{formatCurrency(rrn.rrn_amount)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <p className="font-bold text-lg text-green-600">{formatCurrency(rrn.balance)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(rrn.expiry_date).toLocaleDateString('en-IN')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(rrn.expiry_date) > new Date() 
                              ? `${Math.ceil((new Date(rrn.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                              : 'Expired'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Original Bill</p>
                      <p className="font-medium">{rrn.sales_bill_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Return Reason</p>
                      {getReturnReasonBadge(rrn.return_reason)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">RRN Date</p>
                      <p className="font-medium">{new Date(rrn.rrn_date).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  
                  {rrn.remarks && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-sm text-muted-foreground">Remarks</p>
                        <p className="text-sm bg-muted p-3 rounded-lg mt-1">{rrn.remarks}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Redemption Section */}
            {rrn && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isRRNRedeemable ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {isRRNRedeemable ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                      )}
                    </div>
                    <div>
                      <CardTitle>RRN Redemption</CardTitle>
                      <CardDescription>
                        {isRRNRedeemable 
                          ? "Enter purchase amount to redeem RRN"
                          : "This RRN cannot be redeemed"
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isRRNRedeemable ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="purchase_amount">Purchase Amount *</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="purchase_amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={purchaseAmount}
                            onChange={(e) => setPurchaseAmount(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Full RRN amount must be used. Available: {formatCurrency(rrn.balance)}
                        </p>
                      </div>

                      <Separator />

                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Redemption Rules</h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• Full RRN amount must be used in one transaction</li>
                          <li>• Partial redemption is not allowed</li>
                          <li>• Purchase amount must equal available balance</li>
                          <li>• RRN can be combined with other payment methods</li>
                          <li>• RRN cannot be reused after redemption</li>
                        </ul>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setRrn(null)
                            setRrnNumber("")
                            setPurchaseAmount("")
                          }}
                        >
                          Clear
                        </Button>
                        <Button 
                          onClick={handleRedeem} 
                          disabled={redeeming || !purchaseAmount || parseFloat(purchaseAmount) !== rrn.balance}
                        >
                          {redeeming ? (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Redeem RRN
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                      <h3 className="font-medium text-lg mb-2">Cannot Redeem RRN</h3>
                      <p className="text-muted-foreground mb-4">
                        {rrn.status === 'expired' || new Date(rrn.expiry_date) <= new Date()
                          ? "This RRN has expired and cannot be redeemed."
                          : rrn.status === 'redeemed' 
                          ? "This RRN has already been fully redeemed."
                          : "This RRN is not available for redemption."
                        }
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setRrn(null)
                            setRrnNumber("")
                          }}
                        >
                          Look up Another RRN
                        </Button>
                        <Link href="/returns">
                          <Button>Back to RRNs</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function RedeemRRNPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    }>
      <RedeemRRNContent />
    </Suspense>
  )
}