"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, Calculator, AlertTriangle, CheckCircle } from "lucide-react"

const INDIAN_DENOMINATIONS = [
  { value: 2000, label: "₹2000", color: "bg-purple-100 text-purple-800" },
  { value: 500, label: "₹500", color: "bg-yellow-100 text-yellow-800" },
  { value: 200, label: "₹200", color: "bg-orange-100 text-orange-800" },
  { value: 100, label: "₹100", color: "bg-green-100 text-green-800" },
  { value: 50, label: "₹50", color: "bg-pink-100 text-pink-800" },
  { value: 20, label: "₹20", color: "bg-red-100 text-red-800" },
  { value: 10, label: "₹10", color: "bg-blue-100 text-blue-800" },
  { value: 5, label: "₹5", color: "bg-gray-100 text-gray-800" },
  { value: 2, label: "₹2", color: "bg-gray-100 text-gray-800" },
  { value: 1, label: "₹1", color: "bg-gray-100 text-gray-800" }
]

interface DenominationCount {
  [key: number]: number
}

interface DenominationCounterProps {
  title: string
  description?: string
  expectedAmount?: number
  onCountChange: (denominations: DenominationCount, totalAmount: number) => void
  initialCounts?: DenominationCount
  disabled?: boolean
}

export function DenominationCounter({ 
  title, 
  description,
  expectedAmount,
  onCountChange,
  initialCounts = {},
  disabled = false
}: DenominationCounterProps) {
  const [counts, setCounts] = useState<DenominationCount>(initialCounts)
  const [totalAmount, setTotalAmount] = useState(0)

  // Calculate total amount whenever counts change
  useEffect(() => {
    const total = INDIAN_DENOMINATIONS.reduce((sum, denom) => {
      const count = counts[denom.value] || 0
      return sum + (denom.value * count)
    }, 0)
    
    setTotalAmount(total)
    onCountChange(counts, total)
  }, [counts, onCountChange])

  const handleCountChange = (denomination: number, count: string) => {
    const numCount = parseInt(count) || 0
    setCounts(prev => ({
      ...prev,
      [denomination]: numCount
    }))
  }

  const getDenominationTotal = (denomination: number) => {
    const count = counts[denomination] || 0
    return denomination * count
  }

  const getVariance = () => {
    if (expectedAmount === undefined) return null
    return totalAmount - expectedAmount
  }

  const getVarianceStatus = () => {
    const variance = getVariance()
    if (variance === null || variance === 0) return 'balanced'
    return variance > 0 ? 'excess' : 'shortage'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const variance = getVariance()
  const varianceStatus = getVarianceStatus()

  return (
    <Card className={disabled ? 'opacity-50' : ''}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Calculator className="h-5 w-5 text-green-600 dark:text-green-300" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Denomination Input Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {INDIAN_DENOMINATIONS.map((denom) => (
            <div key={denom.value} className="space-y-2">
              <Label htmlFor={`denom_${denom.value}`} className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${denom.color}`}>
                    {denom.label}
                  </span>
                </div>
              </Label>
              <div className="space-y-1">
                <Input
                  id={`denom_${denom.value}`}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={counts[denom.value] || ''}
                  onChange={(e) => handleCountChange(denom.value, e.target.value)}
                  disabled={disabled}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-center">
                  = {formatCurrency(getDenominationTotal(denom.value))}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Section */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Total Counted */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Counted</Label>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Expected Amount */}
            {expectedAmount !== undefined && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Expected Amount</Label>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-medium">
                    {formatCurrency(expectedAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Variance */}
            {variance !== null && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Variance</Label>
                <div className="flex items-center gap-2">
                  {varianceStatus === 'balanced' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                  <div className="flex items-center gap-1">
                    <span className={`text-lg font-bold ${
                      varianceStatus === 'balanced' ? 'text-green-600' :
                      varianceStatus === 'excess' ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                    </span>
                    <Badge variant={
                      varianceStatus === 'balanced' ? 'default' :
                      varianceStatus === 'excess' ? 'secondary' : 'destructive'
                    }>
                      {varianceStatus === 'balanced' ? 'Perfect' :
                       varianceStatus === 'excess' ? 'Excess' : 'Shortage'}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Notes</p>
            <p className="font-medium">
              {Object.values(counts).reduce((sum, count) => sum + count, 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Largest Note</p>
            <p className="font-medium">
              {INDIAN_DENOMINATIONS.find(d => counts[d.value] > 0)?.label || '-'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Small Change</p>
            <p className="font-medium">
              {formatCurrency([1, 2, 5, 10, 20].reduce((sum, denom) => {
                return sum + (denom * (counts[denom] || 0))
              }, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Large Notes</p>
            <p className="font-medium">
              {formatCurrency([500, 1000, 2000].reduce((sum, denom) => {
                return sum + (denom * (counts[denom] || 0))
              }, 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}