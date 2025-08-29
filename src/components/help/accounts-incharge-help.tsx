"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileCheck } from "lucide-react"

interface AccountsInchargeHelpProps {
  searchQuery: string
  activeSection?: string
}

export function AccountsInchargeHelp({ searchQuery, activeSection }: AccountsInchargeHelpProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <FileCheck className="h-4 w-4" />
        <AlertDescription>
          As Accounts Incharge, you manage reconciliation, reports, and financial oversight across all stores.
        </AlertDescription>
      </Alert>

      <div className="text-center py-12">
        <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Accounts Incharge Documentation</h3>
        <p className="text-muted-foreground">
          Complete documentation for Accounts Incharge is being prepared.
        </p>
      </div>
    </div>
  )
}