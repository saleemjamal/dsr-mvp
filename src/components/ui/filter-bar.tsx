"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building, Calendar as CalendarIcon, Filter, X } from "lucide-react"
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { UserRole } from "@/lib/permissions"

export interface FilterBarProps {
  onFiltersChange?: (filters: FilterState) => void
  showStoreFilter?: boolean
  showDateFilter?: boolean
  additionalFilters?: React.ReactNode
  className?: string
}

export interface FilterState {
  storeId: string | null // null means "All Stores" for multi-store users
  storeName?: string
  dateRange: {
    from: Date
    to: Date
    preset?: string
  }
}

const DATE_PRESETS = [
  {
    label: "Today",
    value: "today",
    getRange: () => {
      const today = new Date()
      return { from: today, to: today }
    }
  },
  {
    label: "Yesterday", 
    value: "yesterday",
    getRange: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: yesterday, to: yesterday }
    }
  },
  {
    label: "Last 7 days",
    value: "last7days",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date()
    })
  },
  {
    label: "This month",
    value: "thismonth",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    label: "Last month",
    value: "lastmonth",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth)
      }
    }
  }
]

export function FilterBar({
  onFiltersChange,
  showStoreFilter = true,
  showDateFilter = true,
  additionalFilters,
  className
}: FilterBarProps) {
  const { profile } = useAuth()
  const { currentStore, accessibleStores, canAccessMultipleStores } = useStore()
  
  const [filters, setFilters] = useState<FilterState>({
    storeId: currentStore?.id || null,
    storeName: currentStore?.store_name,
    dateRange: {
      from: new Date(),
      to: new Date(),
      preset: "today"
    }
  })

  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Determine if store filter should be visible
  const shouldShowStoreFilter = showStoreFilter && canAccessMultipleStores && 
    (profile?.role === UserRole.SUPER_USER || profile?.role === UserRole.ACCOUNTS_INCHARGE)

  // Update filters when current store changes
  useEffect(() => {
    if (!shouldShowStoreFilter && currentStore) {
      setFilters(prev => ({
        ...prev,
        storeId: currentStore.id,
        storeName: currentStore.store_name
      }))
    }
  }, [currentStore, shouldShowStoreFilter])

  // Notify parent of filter changes
  useEffect(() => {
    onFiltersChange?.(filters)
  }, [filters, onFiltersChange])

  const handleStoreChange = (storeId: string) => {
    if (storeId === "all") {
      setFilters(prev => ({
        ...prev,
        storeId: null,
        storeName: "All Stores"
      }))
    } else {
      const store = accessibleStores.find(s => s.id === storeId)
      setFilters(prev => ({
        ...prev,
        storeId: storeId,
        storeName: store?.store_name || ""
      }))
    }
  }

  const handleDatePresetChange = (preset: string) => {
    if (preset === "custom") {
      setShowCustomDateRange(true)
      setFilters(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          preset: "custom"
        }
      }))
    } else {
      const presetConfig = DATE_PRESETS.find(p => p.value === preset)
      if (presetConfig) {
        const range = presetConfig.getRange()
        setFilters(prev => ({
          ...prev,
          dateRange: {
            from: range.from,
            to: range.to,
            preset: preset
          }
        }))
        setShowCustomDateRange(false)
      }
    }
  }

  const handleCustomDateChange = (field: 'from' | 'to', date: Date | undefined) => {
    if (!date) return
    
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: date,
        preset: "custom"
      }
    }))
  }

  const clearFilters = () => {
    setFilters({
      storeId: shouldShowStoreFilter ? null : currentStore?.id || null,
      storeName: shouldShowStoreFilter ? "All Stores" : currentStore?.store_name,
      dateRange: {
        from: new Date(),
        to: new Date(),
        preset: "today"
      }
    })
    setShowCustomDateRange(false)
  }

  const hasActiveFilters = () => {
    const isNonDefaultStore = shouldShowStoreFilter && filters.storeId !== null
    const isNonDefaultDate = filters.dateRange.preset !== "today"
    return isNonDefaultStore || isNonDefaultDate
  }

  return (
    <Card className={cn("mb-6", className)}>
      <CardContent className="pt-6">
        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {hasActiveFilters() && (
              <Badge variant="secondary" className="h-5">
                {(shouldShowStoreFilter && filters.storeId !== null ? 1 : 0) + 
                 (filters.dateRange.preset !== "today" ? 1 : 0)}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Hide" : "Show"}
          </Button>
        </div>

        {/* Filter Controls */}
        <div className={cn(
          "space-y-4 lg:space-y-0 lg:flex lg:items-start lg:gap-4 lg:flex-wrap",
          !isExpanded && "hidden lg:flex"
        )}>
          {/* Store Filter - Only visible to SU/AIC with multiple stores */}
          {shouldShowStoreFilter && (
            <div className="space-y-2 lg:space-y-0 lg:min-w-0 lg:flex-shrink-0">
              <Label className="lg:hidden">Store</Label>
              <Select 
                value={filters.storeId || "all"} 
                onValueChange={handleStoreChange}
              >
                <SelectTrigger className="w-full lg:w-[250px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>All Stores</span>
                    </div>
                  </SelectItem>
                  {accessibleStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="truncate">{store.store_name}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {store.store_code}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Filter - Visible to all users */}
          {showDateFilter && (
            <div className="space-y-2 lg:space-y-0 lg:flex lg:items-center lg:gap-2 lg:flex-shrink-0">
              <Label className="lg:hidden">Date Range</Label>
              
              {/* Date Preset Selector */}
              <Select
                value={filters.dateRange.preset || "custom"}
                onValueChange={handleDatePresetChange}
              >
                <SelectTrigger className="w-full lg:w-[150px]">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Range */}
              {showCustomDateRange && (
                <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full lg:w-auto justify-start text-left font-normal"
                      >
                        {format(filters.dateRange.from, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) => handleCustomDateChange('from', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-muted-foreground text-sm">to</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full lg:w-auto justify-start text-left font-normal"
                      >
                        {format(filters.dateRange.to, "MMM dd, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) => handleCustomDateChange('to', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          )}

          {/* Additional Filters Slot */}
          {additionalFilters}

          {/* Clear Filters Button */}
          {hasActiveFilters() && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters() && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            
            {shouldShowStoreFilter && filters.storeId !== null && (
              <Badge variant="secondary" className="gap-1">
                Store: {filters.storeName}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => handleStoreChange("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {filters.dateRange.preset !== "today" && (
              <Badge variant="secondary" className="gap-1">
                {filters.dateRange.preset === "custom" 
                  ? `${format(filters.dateRange.from, "MMM dd")} - ${format(filters.dateRange.to, "MMM dd")}`
                  : DATE_PRESETS.find(p => p.value === filters.dateRange.preset)?.label
                }
                <Button
                  variant="ghost"
                  size="sm" 
                  className="h-auto p-0 hover:bg-transparent"
                  onClick={() => handleDatePresetChange("today")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}