"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DenominationCounter } from "@/components/ui/denomination-counter"
import { ArrowLeft, Save, Calculator, IndianRupee, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { submitCashCount, calculateExpectedCashAmount, getDefaultStore, type DenominationCount } from "@/lib/cash-service"

// Remove duplicate interface since we're importing it

export default function CashCountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [storeId, setStoreId] = useState<string>("")
  const [expectedAmounts, setExpectedAmounts] = useState({
    salesDrawer: 0,
    pettyCash: 0
  })
  
  const [salesCashData, setSalesCashData] = useState<{
    denominations: DenominationCount
    totalAmount: number
  }>({ denominations: {}, totalAmount: 0 })
  
  const [pettyCashData, setPettyCashData] = useState<{
    denominations: DenominationCount
    totalAmount: number
  }>({ denominations: {}, totalAmount: 0 })

  // Load store and expected amounts on component mount
  useEffect(() => {
    const loadStoreData = async () => {
      try {
        const store = await getDefaultStore()
        if (store) {
          setStoreId(store.id)
          
          // Calculate expected amounts
          const salesExpected = await calculateExpectedCashAmount(store.id, 'sales_cash')
          const pettyExpected = await calculateExpectedCashAmount(store.id, 'petty_cash')
          
          setExpectedAmounts({
            salesDrawer: salesExpected,
            pettyCash: pettyExpected
          })
        }
      } catch (error) {
        console.error('Error loading store data:', error)
        toast.error('Failed to load store information')
      }
    }

    loadStoreData()
  }, [])

  const handleSalesCashChange = useCallback((denominations: DenominationCount, totalAmount: number) => {
    setSalesCashData({ denominations, totalAmount })
  }, [])

  const handlePettyCashChange = useCallback((denominations: DenominationCount, totalAmount: number) => {
    setPettyCashData({ denominations, totalAmount })
  }, [])

  const getSalesVariance = () => {
    return salesCashData.totalAmount - expectedAmounts.salesDrawer
  }

  const getPettyVariance = () => {
    return pettyCashData.totalAmount - expectedAmounts.pettyCash
  }

  const validateCounts = () => {
    const errors = []
    const warnings = []
    
    if (salesCashData.totalAmount === 0) {
      errors.push("Sales cash count is required")
    }
    
    if (pettyCashData.totalAmount === 0) {
      errors.push("Petty cash count is required")
    }

    // Check for critical variance (₹500+)
    const totalVariance = Math.abs(getTotalVariance())
    if (totalVariance >= 500) {
      errors.push(`CRITICAL VARIANCE: ₹${totalVariance} - Requires immediate attention!`)
    }

    // Check for significant variances  
    const salesVariance = Math.abs(getSalesVariance())
    const pettyVariance = Math.abs(getPettyVariance())
    
    if (salesVariance > 100) {
      warnings.push(`Sales cash variance is high: ₹${salesVariance}`)
    }
    
    if (pettyVariance > 50) {
      warnings.push(`Petty cash variance is high: ₹${pettyVariance}`)
    }

    // Show warnings as toasts but don't block submission
    warnings.forEach(warning => toast.warning(warning))
    
    return errors
  }

  const handleSubmit = async () => {
    if (!storeId) {
      toast.error("Store information not loaded")
      return
    }

    const validationErrors = validateCounts()
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error))
      return
    }

    setLoading(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Submit sales cash count
      await submitCashCount({
        store_id: storeId,
        count_date: today,
        count_type: 'sales_drawer',
        denominations: salesCashData.denominations,
        total_counted: salesCashData.totalAmount,
        expected_amount: expectedAmounts.salesDrawer,
        counted_by: 'temp-user-id', // TODO: Get from auth context
        notes: `Variance: ${formatCurrency(getSalesVariance())}`
      })

      // Submit petty cash count
      await submitCashCount({
        store_id: storeId,
        count_date: today,
        count_type: 'petty_cash',
        denominations: pettyCashData.denominations,
        total_counted: pettyCashData.totalAmount,
        expected_amount: expectedAmounts.pettyCash,
        counted_by: 'temp-user-id', // TODO: Get from auth context
        notes: `Variance: ${formatCurrency(getPettyVariance())}`
      })
      
      toast.success("Cash count submitted successfully!")
      
      setTimeout(() => {
        router.push('/cash-management')
      }, 1000)

    } catch (error) {
      console.error('Error submitting cash count:', error)
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
              expectedAmount={expectedAmounts.salesDrawer}
              onCountChange={handleSalesCashChange}
            />

            {/* Petty Cash Counter */}
            <DenominationCounter
              title="Petty Cash Safe"
              description="Count all cash available for expenses and change"
              expectedAmount={expectedAmounts.pettyCash}
              onCountChange={handlePettyCashChange}
            />

            {/* Summary Card */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className={`h-2 ${getTotalVariance() === 0 ? 'gradient-success' : Math.abs(getTotalVariance()) >= 500 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'gradient-warning'}`}></div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                    <Calculator className="h-5 w-5 text-white" />
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
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-transparent">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-1">
                        <IndianRupee className="h-4 w-4 text-success" />
                      </div>
                      <span className="text-sm font-medium">Total Cash Counted</span>
                    </div>
                    <p className="text-2xl font-bold text-cash-positive">
                      {formatCurrency(salesCashData.totalAmount + pettyCashData.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sales: {formatCurrency(salesCashData.totalAmount)} + 
                      Petty: {formatCurrency(pettyCashData.totalAmount)}
                    </p>
                  </div>

                  {/* Total Expected */}
                  <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-transparent">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-1">
                        <Calculator className="h-4 w-4 text-info" />
                      </div>
                      <span className="text-sm font-medium">Total Expected</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {formatCurrency(expectedAmounts.salesDrawer + expectedAmounts.pettyCash)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sales: {formatCurrency(expectedAmounts.salesDrawer)} + 
                      Petty: {formatCurrency(expectedAmounts.pettyCash)}
                    </p>
                  </div>

                  {/* Total Variance */}
                  <div className={`space-y-2 p-4 rounded-lg ${
                    getTotalVariance() === 0 ? 'bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-transparent' :
                    Math.abs(getTotalVariance()) >= 500 ? 'bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-transparent' :
                    'bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-transparent'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-full p-1 ${
                        getTotalVariance() === 0 ? 'bg-green-100 dark:bg-green-900/30' :
                        Math.abs(getTotalVariance()) >= 500 ? 'bg-red-100 dark:bg-red-900/30' :
                        'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                        {getTotalVariance() === 0 ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : Math.abs(getTotalVariance()) >= 500 ? (
                          <AlertTriangle className="h-4 w-4 text-cash-negative" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <span className="text-sm font-medium">Total Variance</span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      getTotalVariance() === 0 ? 'text-cash-positive' :
                      Math.abs(getTotalVariance()) >= 500 ? 'text-cash-negative' :
                      'text-warning'
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