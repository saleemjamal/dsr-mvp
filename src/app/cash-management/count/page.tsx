"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DenominationCounter } from "@/components/ui/denomination-counter"
import { ArrowLeft, Save, Calculator, IndianRupee, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface DenominationCount {
  [key: number]: number
}

// Mock expected amounts - in real app this would come from transaction calculations
const mockExpectedAmounts = {
  salesDrawer: 15000, // Based on cash sales + advances - transfers - deposits
  pettyCash: 3200     // Previous balance + transfers - expenses
}

export default function CashCountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [salesCashData, setSalesCashData] = useState<{
    denominations: DenominationCount
    totalAmount: number
  }>({ denominations: {}, totalAmount: 0 })
  
  const [pettyCashData, setPettyCashData] = useState<{
    denominations: DenominationCount
    totalAmount: number
  }>({ denominations: {}, totalAmount: 0 })

  const handleSalesCashChange = useCallback((denominations: DenominationCount, totalAmount: number) => {
    setSalesCashData({ denominations, totalAmount })
  }, [])

  const handlePettyCashChange = useCallback((denominations: DenominationCount, totalAmount: number) => {
    setPettyCashData({ denominations, totalAmount })
  }, [])

  const getSalesVariance = () => {
    return salesCashData.totalAmount - mockExpectedAmounts.salesDrawer
  }

  const getPettyVariance = () => {
    return pettyCashData.totalAmount - mockExpectedAmounts.pettyCash
  }

  const validateCounts = () => {
    const errors = []
    
    if (salesCashData.totalAmount === 0) {
      errors.push("Sales cash count is required")
    }
    
    if (pettyCashData.totalAmount === 0) {
      errors.push("Petty cash count is required")
    }

    // Check for significant variances
    const salesVariance = Math.abs(getSalesVariance())
    const pettyVariance = Math.abs(getPettyVariance())
    
    if (salesVariance > 100) {
      errors.push(`Sales cash variance is high: ₹${salesVariance}`)
    }
    
    if (pettyVariance > 50) {
      errors.push(`Petty cash variance is high: ₹${pettyVariance}`)
    }
    
    return errors
  }

  const handleSubmit = async () => {
    const validationErrors = validateCounts()
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
      return
    }

    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      const cashCountData = {
        date: new Date().toISOString().split('T')[0],
        salesCash: {
          denominations: salesCashData.denominations,
          totalCounted: salesCashData.totalAmount,
          expectedAmount: mockExpectedAmounts.salesDrawer,
          variance: getSalesVariance()
        },
        pettyCash: {
          denominations: pettyCashData.denominations,
          totalCounted: pettyCashData.totalAmount,
          expectedAmount: mockExpectedAmounts.pettyCash,
          variance: getPettyVariance()
        },
        countedBy: "current-user-id", // TODO: Get from auth context
        countedAt: new Date().toISOString()
      }

      console.log('Submitting cash count:', cashCountData)
      
      toast.success("Cash count submitted successfully!")
      
      setTimeout(() => {
        router.push('/cash-management')
      }, 1000)

    } catch (error) {
      toast.error("Failed to submit cash count. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getTotalVariance = () => {
    return getSalesVariance() + getPettyVariance()
  }

  const isCountComplete = () => {
    return salesCashData.totalAmount > 0 && pettyCashData.totalAmount > 0
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/cash-management">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Daily Cash Count</h2>
              <p className="text-muted-foreground">
                Count denominations for sales drawer and petty cash
              </p>
            </div>
          </div>

          {/* Cash Count Forms */}
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Sales Cash Counter */}
            <DenominationCounter
              title="Sales Cash Drawer"
              description="Count all cash from sales transactions"
              expectedAmount={mockExpectedAmounts.salesDrawer}
              onCountChange={handleSalesCashChange}
            />

            {/* Petty Cash Counter */}
            <DenominationCounter
              title="Petty Cash Safe"
              description="Count all cash available for expenses and change"
              expectedAmount={mockExpectedAmounts.pettyCash}
              onCountChange={handlePettyCashChange}
            />

            {/* Summary Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div>
                    <CardTitle>Count Summary</CardTitle>
                    <CardDescription>
                      Review total counts and variances before submitting
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Total Cash */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Total Cash Counted</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(salesCashData.totalAmount + pettyCashData.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sales: {formatCurrency(salesCashData.totalAmount)} + 
                      Petty: {formatCurrency(pettyCashData.totalAmount)}
                    </p>
                  </div>

                  {/* Total Expected */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Total Expected</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {formatCurrency(mockExpectedAmounts.salesDrawer + mockExpectedAmounts.pettyCash)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sales: {formatCurrency(mockExpectedAmounts.salesDrawer)} + 
                      Petty: {formatCurrency(mockExpectedAmounts.pettyCash)}
                    </p>
                  </div>

                  {/* Total Variance */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getTotalVariance() === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      )}
                      <span className="text-sm font-medium">Total Variance</span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      getTotalVariance() === 0 ? 'text-green-600' :
                      getTotalVariance() > 0 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {getTotalVariance() > 0 ? '+' : ''}{formatCurrency(getTotalVariance())}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sales: {getSalesVariance() > 0 ? '+' : ''}{formatCurrency(getSalesVariance())} | 
                      Petty: {getPettyVariance() > 0 ? '+' : ''}{formatCurrency(getPettyVariance())}
                    </p>
                  </div>
                </div>

                {/* Variance Alerts */}
                {(Math.abs(getSalesVariance()) > 100 || Math.abs(getPettyVariance()) > 50) && (
                  <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900 dark:text-orange-100">High Variance Detected</span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Please double-check your counts. Large variances may require manager approval.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
                  <Link href="/cash-management">
                    <Button variant="outline">
                      Cancel
                    </Button>
                  </Link>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading || !isCountComplete()}
                  >
                    {loading ? (
                      <>
                        <Save className="mr-2 h-4 w-4 animate-spin" />
                        Saving Count...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Submit Cash Count
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}