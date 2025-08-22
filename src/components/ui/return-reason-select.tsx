"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Zap, Package, Heart, RefreshCw, XCircle } from "lucide-react"

const returnReasons = [
  { value: "defective", label: "Defective/Damaged", icon: AlertTriangle },
  { value: "wrong_size", label: "Wrong Size", icon: Package },
  { value: "wrong_item", label: "Wrong Item Delivered", icon: XCircle },
  { value: "not_as_described", label: "Not as Described", icon: RefreshCw },
  { value: "change_of_mind", label: "Change of Mind", icon: Heart },
  { value: "duplicate_order", label: "Duplicate Order", icon: Zap },
  { value: "other", label: "Other", icon: RefreshCw }
]

interface ReturnReasonSelectProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export function ReturnReasonSelect({ 
  value, 
  onValueChange, 
  label = "Return Reason",
  placeholder = "Select return reason",
  required = false,
  disabled = false
}: ReturnReasonSelectProps) {
  const selectedReason = returnReasons.find(r => r.value === value)
  
  return (
    <div className="space-y-2">
      <Label htmlFor="return_reason">{label} {required && "*"}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedReason && (
              <div className="flex items-center gap-2">
                <selectedReason.icon className="h-4 w-4" />
                {selectedReason.label}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {returnReasons.map((reason) => (
            <SelectItem key={reason.value} value={reason.value}>
              <div className="flex items-center gap-2">
                <reason.icon className="h-4 w-4" />
                {reason.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}