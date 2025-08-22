"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Search, RotateCcw, User, Calendar, IndianRupee, Receipt, AlertTriangle, CheckCircle, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const mockRRNs = [
  {
    id: "1",
    rrn_number: "RRN2025001",
    rrn_amount: 1250.00,
    balance: 1250.00,
    status: "active",
    customer_name: "Rajesh Kumar",
    customer_phone: "+91 9876543001",
    customer_email: "rajesh@example.com",
    rrn_date: "2025-01-20",
    expiry_date: "2026-01-20",
    sales_bill_number: "BILL-2025-001",
    return_reason: "defective",
    tender_type: "cash",
    created_at: "2025-01-20T10:30:00Z"
  },
  {
    id: "2",
    rrn_number: "RRN2025002", 
    rrn_amount: 850.00,
    balance: 850.00,
    status: "active",
    customer_name: "Priya Sharma",
    customer_phone: "+91 9876543002",
    customer_email: "priya@example.com",
    rrn_date: "2025-01-19",
    expiry_date: "2026-01-19",
    sales_bill_number: "BILL-2025-002",
    return_reason: "wrong_size",
    tender_type: "upi",
    created_at: "2025-01-19T14:20:00Z"
  },
  {
    id: "3",
    rrn_number: "RRN2025003",
    rrn_amount: 2000.00,
    balance: 0.00,
    status: "redeemed",
    customer_name: "Amit Patel",
    customer_phone: "+91 9876543003",
    customer_email: "amit@example.com",
    rrn_date: "2025-01-18",
    expiry_date: "2026-01-18",
    sales_bill_number: "BILL-2025-003",
    return_reason: "change_of_mind",
    tender_type: "credit_card",
    created_at: "2025-01-18T09:15:00Z"
  }
]

export default function RedeemRRNForSalePage() {
  const router = useRouter()
  const [rrnNumber, setRrnNumber] = useState("")
  const [saleAmount, setSaleAmount] = useState("")
  const [rrn, setRrn] = useState(null)
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(false)

  const handleLookup = async () => {
    if (!rrnNumber.trim()) {
      toast.error("Please enter an RRN number")
      return
    }

    setLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const foundRRN = mockRRNs.find(r => 
        r.rrn_number.toLowerCase() === rrnNumber.toLowerCase()
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
        toast.error("This RRN has already been redeemed")
      } else if (new Date(foundRRN.expiry_date) <= new Date()) {
        toast.error("This RRN has expired")
      } else {
        toast.success("RRN found and available for redemption")
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
    
    const amount = parseFloat(saleAmount)
    if (!saleAmount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid sale amount")
      return
    }
    
    if (amount > rrn.balance) {
      toast.error(`Sale amount (${formatCurrency(amount)}) exceeds RRN balance (${formatCurrency(rrn.balance)})`)
      return
    }
    
    if (amount < rrn.balance) {
      toast.error("Partial redemption not allowed. Full RRN amount must be used in one transaction.")
      return
    }

    setRedeeming(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('Redeeming RRN for sale:', {
        rrn_id: rrn.id,
        rrn_number: rrn.rrn_number,
        amount_redeemed: amount,
        sale_amount: amount,
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

  const getStatusBadge = (status: string, expiryDate: string) => {
    const isExpired = new Date(expiryDate) <= new Date()
    
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>
    }
    
    const variants = {
      active: "default",
      redeemed: "secondary", 
      expired: "destructive"
    } as const
    
    return <Badge variant={variants[status as keyof typeof variants] || "outline"}>{status.toUpperCase()}</Badge>
  }

  const getReturnReasonLabel = (reason: string) => {
    const reasons = {
      defective: "Defective/Damaged",
      wrong_size: "Wrong Size", 
      wrong_item: "Wrong Item Delivered",
      not_as_described: "Not as Described",
      change_of_mind: "Change of Mind",
      duplicate_order: "Duplicate Order",
      other: "Other"
    }
    return reasons[reason as keyof typeof reasons] || reason
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
              <h2 className="text-3xl font-bold tracking-tight">Redeem RRN for Sale</h2>
              <p className="text-muted-foreground">
                Look up and redeem Return Receipt Notes as payment for customer purchases
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
                      Enter RRN number to verify and redeem for sale
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
                  <Button onClick={handleLookup} disabled={loading}>
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
                    {getStatusBadge(rrn.status, rrn.expiry_date)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Information */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Customer Information</p>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{rrn.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{rrn.customer_phone}</p>
                            {rrn.customer_email && (
                              <p className="text-sm text-muted-foreground">{rrn.customer_email}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Return Information</p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Original Bill:</span>
                            <span className="text-sm font-medium">{rrn.sales_bill_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Return Reason:</span>
                            <span className="text-sm font-medium">{getReturnReasonLabel(rrn.return_reason)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Original Payment:</span>
                            <span className="text-sm font-medium">{rrn.tender_type.replace('_', ' ').toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount Information */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">RRN Amount</p>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold text-lg">{formatCurrency(rrn.rrn_amount)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <p className="font-bold text-lg text-green-600">{formatCurrency(rrn.balance)}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Validity</p>
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
                  </div>
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
                          ? "Enter sale amount to redeem RRN as payment"
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
                        <Label htmlFor="sale_amount">Sale Amount *</Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="sale_amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={saleAmount}
                            onChange={(e) => setSaleAmount(e.target.value)}
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
                          <li>• Sale amount must equal available RRN balance</li>
                          <li>• RRN cannot be reused after redemption</li>
                          <li>• RRN can be combined with other payment methods</li>
                        </ul>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setRrn(null)
                            setRrnNumber("")
                            setSaleAmount("")
                          }}
                        >
                          Clear
                        </Button>
                        <Button 
                          onClick={handleRedeem} 
                          disabled={redeeming || !saleAmount || parseFloat(saleAmount) !== rrn.balance}
                        >
                          {redeeming ? (
                            <>
                              <ShoppingCart className="mr-2 h-4 w-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
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
                          ? "This RRN has already been redeemed."
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
                          <Button>Back to Returns</Button>
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