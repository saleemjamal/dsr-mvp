"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Building, ChevronDown } from "lucide-react"
import { useStore } from "@/contexts/store-context"

export function StoreSwitcher() {
  const { currentStore, accessibleStores, setCurrentStore, canAccessMultipleStores, loading } = useStore()
  const [showDialog, setShowDialog] = useState(false)

  if (loading || !canAccessMultipleStores || accessibleStores.length <= 1) {
    return null
  }

  const handleStoreChange = (storeId: string) => {
    const store = accessibleStores.find(s => s.id === storeId)
    if (store) {
      setCurrentStore(store)
      setShowDialog(false)
    }
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[200px]">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span className="truncate">
              {currentStore ? currentStore.store_name : 'Select Store'}
            </span>
            {currentStore && (
              <Badge variant="secondary" className="text-xs">
                {currentStore.store_code}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch Store</DialogTitle>
          <DialogDescription>
            Select which store you want to manage
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Store</label>
            <div className="mt-1">
              {currentStore && (
                <div className="flex items-center gap-2 p-2 border rounded-md">
                  <Building className="h-4 w-4" />
                  <span>{currentStore.store_name}</span>
                  <Badge variant="secondary">{currentStore.store_code}</Badge>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Switch To</label>
            <Select value={currentStore?.id} onValueChange={handleStoreChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a store" />
              </SelectTrigger>
              <SelectContent>
                {accessibleStores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>{store.store_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {store.store_code}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}