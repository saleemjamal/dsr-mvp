"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { CreditCard, Smartphone, Banknote, Gift, Building } from "lucide-react"

const tenderTypes = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "gift_voucher", label: "Gift Voucher", icon: Gift },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building }
]

interface TenderTypeSelectProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export function TenderTypeSelect({ 
  value, 
  onValueChange, 
  label = "Payment Method",
  placeholder = "Select payment method",
  required = false,
  disabled = false
}: TenderTypeSelectProps) {
  const selectedTender = tenderTypes.find(t => t.value === value)
  
  return (
    <div className="space-y-2">
      <Label htmlFor="tender_type">{label} {required && "*"}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedTender && (
              <div className="flex items-center gap-2">
                <selectedTender.icon className="h-4 w-4" />
                {selectedTender.label}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tenderTypes.map((tender) => (
            <SelectItem key={tender.value} value={tender.value}>
              <div className="flex items-center gap-2">
                <tender.icon className="h-4 w-4" />
                {tender.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}