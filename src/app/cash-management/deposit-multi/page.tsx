"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Banknote, Calendar, CheckCircle, IndianRupee, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"
import { 
  getPendingPositions, 
  createMultiDayDeposit,
  calculateVarianceTolerance,
  type DailyCashPosition 
} from "@/lib/daily-cash-service"

export default function MultiDayDepositPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { currentStore } = useStore()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Pending positions data
  const [pendingPositions, setPendingPositions] = useState<DailyCashPosition[]>([])
  const [selectedPositions, setSelectedPositions] = useState<string[]>([])
  
  // Form fields
  const [countedAmount, setCountedAmount] = useState("")
  const [depositSlipNumber, setDepositSlipNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [notes, setNotes] = useState("")
  const [varianceReason, setVarianceReason] = useState("")

  // Load pending positions
  useEffect(() => {
    if (!currentStore?.id) return

    const loadPendingPositions = async () => {
      try {
        setLoading(true)
        const positions = await getPendingPositions(currentStore.id)
        setPendingPositions(positions)
        
        // Auto-select all positions by default
        setSelectedPositions(positions.map(p => p.id || '').filter(Boolean))
      } catch (error) {
        console.error('Error loading positions:', error)
        toast.error('Failed to load pending cash positions')
      } finally {
        setLoading(false)
      }
    }

    loadPendingPositions()
  }, [currentStore])

  // Calculate selected total
  const calculateSelectedTotal = () => {
    return selectedPositions.reduce((total, posId) => {
      const position = pendingPositions.find(p => p.id === posId)
      return total + (position?.closing_balance || 0)
    }, 0)
  }

  // Toggle position selection
  const togglePosition = (positionId: string) => {
    setSelectedPositions(prev => 
      prev.includes(positionId) 
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    )
  }

  // Select all positions
  const selectAll = () => {
    setSelectedPositions(pendingPositions.map(p => p.id || '').filter(Boolean))
  }

  // Deselect all positions
  const deselectAll = () => {
    setSelectedPositions([])
  }

  // Select last N days
  const selectLastNDays = (days: number) => {
    const positions = pendingPositions.slice(0, days)
    setSelectedPositions(positions.map(p => p.id || '').filter(Boolean))
  }

  // Calculate days ago
  const getDaysAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - date.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Get urgency badge variant
  const getUrgencyVariant = (daysAgo: number) => {
    if (daysAgo > 3) return "destructive"
    if (daysAgo === 3) return "secondary" // Changed from "warning" to "secondary"
    return "outline"
  }

  // Handle deposit submission
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentStore?.id || !profile || selectedPositions.length === 0) return
    
    const selectedTotal = calculateSelectedTotal()
    const counted = parseFloat(countedAmount || selectedTotal.toString())
    const variance = counted - selectedTotal
    const varianceTolerance = calculateVarianceTolerance(selectedPositions.length)
    
    // Check variance
    if (Math.abs(variance) > varianceTolerance) {
      if (!varianceReason.trim()) {
        toast.error(`Variance of ₹${Math.abs(variance).toFixed(2)} exceeds tolerance. Please provide an explanation.`)
        return
      }
    }
    
    // Validate required fields
    if (!depositSlipNumber.trim()) {
      toast.error('Deposit slip number is required')
      return
    }
    
    if (!bankName) {
      toast.error('Please select a bank')
      return
    }
    
    try {
      setSubmitting(true)
      
      const result = await createMultiDayDeposit({
        storeId: currentStore.id,
        positionIds: selectedPositions,
        depositAmount: selectedTotal, // Always deposit the actual amount
        depositSlipNumber: depositSlipNumber.trim(),
        bankName,
        depositedBy: profile.full_name || profile.email || 'Unknown',
        notes: `${notes}${variance !== 0 ? ` | Variance: ₹${variance.toFixed(2)} - ${varianceReason}` : ''}`
      })
      
      if (result.success) {
        toast.success(`Deposit recorded successfully for ${selectedPositions.length} days`)
        router.push('/cash-management')
      } else {
        toast.error(result.error || 'Failed to record deposit')
      }
      
    } catch (error) {
      console.error('Deposit error:', error)
      toast.error('Failed to record deposit')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  if (!currentStore?.id) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="py-8">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Store Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Please select a store before recording a deposit
                  </p>
                  <Button onClick={() => router.push('/cash-management')} variant="outline">
                    Go Back to Cash Management
                  </Button>
                </div>
              </CardContent>
            </Card>
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
          <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Record Bank Deposit</h2>
              <p className="text-muted-foreground">
                Select days to include in this deposit
              </p>
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                    <span>Loading pending cash positions...</span>
                  </div>
                </CardContent>
              </Card>
            ) : pendingPositions.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Pending Cash</h3>
                    <p className="text-muted-foreground">
                      All cash has been deposited. No pending amounts to deposit.
                    </p>
                    <Button 
                      onClick={() => router.push('/cash-management')} 
                      variant="outline"
                      className="mt-4"
                    >
                      Back to Cash Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleDeposit}>
                {/* Day Selection Card */}
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Select Days to Deposit</CardTitle>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                          Select All
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => selectLastNDays(3)}>
                          Last 3 Days
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedPositions.length === pendingPositions.length}
                              onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
                            />
                          </TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Advances</TableHead>
                          <TableHead className="text-right">Other</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Age</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPositions.map(position => {
                          const daysAgo = getDaysAgo(position.business_date)
                          const isSelected = selectedPositions.includes(position.id || '')
                          
                          return (
                            <TableRow 
                              key={position.id}
                              className={isSelected ? 'bg-muted/50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => position.id && togglePosition(position.id)}
                                />
                              </TableCell>
                              <TableCell>
                                {format(new Date(position.business_date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>
                                {format(new Date(position.business_date), 'EEEE')}
                                {position.is_bank_holiday && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {position.holiday_name || 'Holiday'}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(position.cash_sales)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(position.so_advances)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  position.gift_voucher_sales + 
                                  position.hand_bill_collections + 
                                  position.other_receipts -
                                  position.cash_returns -
                                  position.petty_transfers_out
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatCurrency(position.closing_balance || 0)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getUrgencyVariant(daysAgo)}>
                                  {daysAgo} {daysAgo === 1 ? 'day' : 'days'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={6} className="text-right font-medium">
                            Selected Total
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-xl font-bold">
                              {formatCurrency(calculateSelectedTotal())}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {selectedPositions.length} {selectedPositions.length === 1 ? 'day' : 'days'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </CardContent>
                </Card>

                {/* Deposit Details Card */}
                {selectedPositions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Deposit Details</CardTitle>
                      <CardDescription>
                        Enter bank deposit information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="depositAmount">Deposit Amount</Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="depositAmount"
                              type="text"
                              value={formatCurrency(calculateSelectedTotal())}
                              disabled
                              className="pl-10 font-bold"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total of selected days
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="countedAmount">Counted Amount (if different)</Label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="countedAmount"
                              type="number"
                              step="0.01"
                              value={countedAmount}
                              onChange={(e) => setCountedAmount(e.target.value)}
                              placeholder={calculateSelectedTotal().toString()}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Variance Alert */}
                      {countedAmount && parseFloat(countedAmount) !== calculateSelectedTotal() && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Variance Detected</AlertTitle>
                          <AlertDescription>
                            <div className="space-y-2">
                              <p>
                                Expected: {formatCurrency(calculateSelectedTotal())}, 
                                Counted: {formatCurrency(parseFloat(countedAmount))}, 
                                Variance: {formatCurrency(parseFloat(countedAmount) - calculateSelectedTotal())}
                              </p>
                              {Math.abs(parseFloat(countedAmount) - calculateSelectedTotal()) > 
                               calculateVarianceTolerance(selectedPositions.length) && (
                                <div>
                                  <Label htmlFor="varianceReason">Explanation Required *</Label>
                                  <Textarea
                                    id="varianceReason"
                                    value={varianceReason}
                                    onChange={(e) => setVarianceReason(e.target.value)}
                                    placeholder="Explain the reason for variance..."
                                    required
                                  />
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="depositSlip">Deposit Slip Number *</Label>
                          <Input
                            id="depositSlip"
                            type="text"
                            value={depositSlipNumber}
                            onChange={(e) => setDepositSlipNumber(e.target.value)}
                            placeholder="e.g., DEP123456"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="bank">Bank Name *</Label>
                          <Select value={bankName} onValueChange={setBankName} required>
                            <SelectTrigger id="bank">
                              <SelectValue placeholder="Select bank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HDFC Bank">HDFC Bank</SelectItem>
                              <SelectItem value="ICICI Bank">ICICI Bank</SelectItem>
                              <SelectItem value="State Bank of India">State Bank of India</SelectItem>
                              <SelectItem value="Axis Bank">Axis Bank</SelectItem>
                              <SelectItem value="Kotak Mahindra Bank">Kotak Mahindra Bank</SelectItem>
                              <SelectItem value="Yes Bank">Yes Bank</SelectItem>
                              <SelectItem value="Punjab National Bank">Punjab National Bank</SelectItem>
                              <SelectItem value="Bank of Baroda">Bank of Baroda</SelectItem>
                              <SelectItem value="Canara Bank">Canara Bank</SelectItem>
                              <SelectItem value="Union Bank of India">Union Bank of India</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any additional information..."
                          rows={3}
                        />
                      </div>

                      {/* Info Alert */}
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Deposit Information</AlertTitle>
                        <AlertDescription>
                          You are depositing cash for {selectedPositions.length} days 
                          from {format(new Date(pendingPositions.find(p => selectedPositions.includes(p.id || ''))?.business_date || ''), 'MMM dd')} 
                          to {format(new Date(pendingPositions.filter(p => selectedPositions.includes(p.id || '')).slice(-1)[0]?.business_date || ''), 'MMM dd, yyyy')}.
                          This will mark these days as deposited and reduce your sales cash balance.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                    <CardFooter className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={submitting || selectedPositions.length === 0}
                        className="flex-1"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Recording Deposit...
                          </>
                        ) : (
                          <>
                            <Banknote className="mr-2 h-4 w-4" />
                            Record Deposit for {selectedPositions.length} Days
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/cash-management')}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}