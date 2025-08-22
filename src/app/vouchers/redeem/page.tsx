"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Search, Gift, User, Calendar, IndianRupee, CreditCard, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const mockVouchers = [
  {
    id: "1",
    voucher_number: "GV2025001",
    amount: 1000.00,
    balance: 1000.00,
    status: "active",
    customer_name: "Rahul Sharma",
    customer_phone: "+91 9876543001",
    issued_date: "2025-01-20",
    expiry_date: "2025-12-31",
    created_at: "2025-01-20T10:30:00Z"
  },
  {
    id: "2",
    voucher_number: "GV2025002", 
    amount: 500.00,
    balance: 500.00,
    status: "active",
    customer_name: "Priya Patel",
    customer_phone: "+91 9876543002",
    issued_date: "2025-01-19",
    expiry_date: "2025-06-30",
    created_at: "2025-01-19T14:20:00Z"
  },
  {
    id: "3",
    voucher_number: "GV2025003",
    amount: 2000.00,
    balance: 0.00,
    status: "redeemed",
    customer_name: "Amit Kumar",
    customer_phone: "+91 9876543003",
    issued_date: "2025-01-18",
    expiry_date: "2025-12-31",
    created_at: "2025-01-18T09:15:00Z"
  },
  {
    id: "4",
    voucher_number: "GV2025004",
    amount: 1500.00,
    balance: 1500.00,
    status: "active",
    customer_name: "Sneha Singh",
    customer_phone: "+91 9876543004",
    issued_date: "2025-01-15",
    expiry_date: "2025-02-15",
    created_at: "2025-01-15T16:45:00Z"
  },
  {
    id: "5",
    voucher_number: "GV2024999",
    amount: 800.00,
    balance: 800.00,
    status: "expired",
    customer_name: "Vikram Gupta",
    customer_phone: "+91 9876543005",
    issued_date: "2024-12-20",
    expiry_date: "2025-01-20",
    created_at: "2024-12-20T11:10:00Z"
  }
]

export default function RedeemVoucherPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [voucherNumber, setVoucherNumber] = useState("")
  const [purchaseAmount, setPurchaseAmount] = useState("")
  const [voucher, setVoucher] = useState(null)
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  
  useEffect(() => {
    const voucherParam = searchParams?.get('voucher')
    if (voucherParam) {
      setVoucherNumber(voucherParam)
      handleLookup(voucherParam)
    }
  }, [searchParams])

  const handleLookup = async (searchNumber?: string) => {
    const lookupNumber = searchNumber || voucherNumber
    if (!lookupNumber.trim()) {
      toast.error("Please enter a voucher number")
      return
    }

    setLoading(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const foundVoucher = mockVouchers.find(v => 
        v.voucher_number.toLowerCase() === lookupNumber.toLowerCase()
      )
      
      if (!foundVoucher) {
        toast.error("Voucher not found")
        setVoucher(null)
        return
      }
      
      setVoucher(foundVoucher)
      
      if (foundVoucher.status === 'expired') {
        toast.error("This voucher has expired")
      } else if (foundVoucher.status === 'redeemed') {
        toast.error("This voucher has already been fully redeemed")
      } else if (new Date(foundVoucher.expiry_date) <= new Date()) {
        toast.error("This voucher has expired")
      } else {
        toast.success("Voucher found and ready for redemption")
      }
      
    } catch (error) {
      toast.error("Failed to lookup voucher")
      setVoucher(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (!voucher) return
    
    const amount = parseFloat(purchaseAmount)
    if (!purchaseAmount || isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid purchase amount")
      return
    }
    
    if (amount > voucher.balance) {
      toast.error(`Purchase amount (${formatCurrency(amount)}) exceeds voucher balance (${formatCurrency(voucher.balance)})`)
      return
    }
    
    if (amount < voucher.balance) {
      toast.error("Partial redemption not allowed. Full voucher amount must be used in one transaction.")
      return
    }

    setRedeeming(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('Redeeming voucher:', {
        voucher_id: voucher.id,
        voucher_number: voucher.voucher_number,
        amount_redeemed: amount,
        remaining_balance: voucher.balance - amount,
        redeemed_at: new Date().toISOString()
      })
      
      toast.success(`Voucher ${voucher.voucher_number} redeemed successfully for ${formatCurrency(amount)}!`)
      
      setTimeout(() => {
        router.push('/vouchers')
      }, 2000)
      
    } catch (error) {
      toast.error("Failed to redeem voucher. Please try again.")
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

  const isVoucherRedeemable = voucher && 
    voucher.status === 'active' && 
    voucher.balance > 0 &&
    new Date(voucher.expiry_date) > new Date()

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
              <h2 className="text-3xl font-bold tracking-tight">Redeem Gift Voucher</h2>
              <p className="text-muted-foreground">
                Look up and redeem gift vouchers for customer purchases
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Voucher Lookup */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Search className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <CardTitle>Voucher Lookup</CardTitle>
                    <CardDescription>
                      Enter voucher number to verify and redeem
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="voucher_number" className="sr-only">Voucher Number</Label>
                    <Input
                      id="voucher_number"
                      placeholder="Enter voucher number (e.g., GV2025001)"
                      value={voucherNumber}
                      onChange={(e) => setVoucherNumber(e.target.value.toUpperCase())}
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

            {/* Voucher Details */}
            {voucher && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Gift className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Voucher Details</CardTitle>
                        <CardDescription>
                          {voucher.voucher_number} - {voucher.customer_name}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(voucher.status, voucher.expiry_date)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{voucher.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{voucher.customer_phone}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Original Amount</p>
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-lg">{formatCurrency(voucher.amount)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="font-bold text-lg text-green-600">{formatCurrency(voucher.balance)}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {new Date(voucher.expiry_date).toLocaleDateString('en-IN')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(voucher.expiry_date) > new Date() 
                              ? `${Math.ceil((new Date(voucher.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left`
                              : 'Expired'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Redemption Section */}
            {voucher && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isVoucherRedeemable ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      {isVoucherRedeemable ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-300" />
                      )}
                    </div>
                    <div>
                      <CardTitle>Voucher Redemption</CardTitle>
                      <CardDescription>
                        {isVoucherRedeemable 
                          ? "Enter purchase amount to redeem voucher"
                          : "This voucher cannot be redeemed"
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isVoucherRedeemable ? (
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
                          Full voucher amount must be used. Available: {formatCurrency(voucher.balance)}
                        </p>
                      </div>

                      <Separator />

                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-2">Redemption Rules</h4>
                        <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                          <li>• Full voucher amount must be used in one transaction</li>
                          <li>• Partial redemption is not allowed</li>
                          <li>• Purchase amount must equal available balance</li>
                          <li>• Voucher cannot be reused after redemption</li>
                        </ul>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setVoucher(null)
                            setVoucherNumber("")
                            setPurchaseAmount("")
                          }}
                        >
                          Clear
                        </Button>
                        <Button 
                          onClick={handleRedeem} 
                          disabled={redeeming || !purchaseAmount || parseFloat(purchaseAmount) !== voucher.balance}
                        >
                          {redeeming ? (
                            <>
                              <CreditCard className="mr-2 h-4 w-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : (
                            <>
                              <Gift className="mr-2 h-4 w-4" />
                              Redeem Voucher
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                      <h3 className="font-medium text-lg mb-2">Cannot Redeem Voucher</h3>
                      <p className="text-muted-foreground mb-4">
                        {voucher.status === 'expired' || new Date(voucher.expiry_date) <= new Date()
                          ? "This voucher has expired and cannot be redeemed."
                          : voucher.status === 'redeemed' 
                          ? "This voucher has already been fully redeemed."
                          : "This voucher is not available for redemption."
                        }
                      </p>
                      <div className="flex justify-center space-x-4">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setVoucher(null)
                            setVoucherNumber("")
                          }}
                        >
                          Look up Another Voucher
                        </Button>
                        <Link href="/vouchers">
                          <Button>Back to Vouchers</Button>
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