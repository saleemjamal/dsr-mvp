"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { FilterBar, type FilterState } from "@/components/ui/filter-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Download, FileText, AlertTriangle, CheckCircle, Loader2, HelpCircle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission } from "@/lib/permissions"
import { useAuth } from "@/contexts/auth-context"
import { useStore } from "@/contexts/store-context"
import { toast } from "sonner"
import { getTallyExportPreview, generateTallyExport, type TallyExportConfig } from "@/lib/tally-export-service"

interface TallyExportData {
  expenses: number
  sales: number
  handBills: number
  cashTransactions: number
  estimated: boolean
}

const exportFormats = [
  {
    id: 'xml',
    name: 'Tally XML Format',
    description: 'Standard Tally import format with vouchers',
    extension: '.xml',
    recommended: true
  },
  {
    id: 'excel',
    name: 'Excel Template',
    description: 'Structured Excel format for manual entry',
    extension: '.xlsx',
    recommended: false
  },
  {
    id: 'csv',
    name: 'CSV Data',
    description: 'Comma-separated values for custom processing',
    extension: '.csv', 
    recommended: false
  }
]

const voucherTypes = [
  { id: 'sales', name: 'Sales Vouchers', description: 'Daily sales transactions', included: true },
  { id: 'purchase', name: 'Purchase Vouchers', description: 'Supplier payments and purchases', included: true },
  { id: 'payment', name: 'Payment Vouchers', description: 'Cash and expense payments', included: true },
  { id: 'receipt', name: 'Receipt Vouchers', description: 'Cash receipts and collections', included: true },
  { id: 'contra', name: 'Contra Vouchers', description: 'Cash transfers between accounts', included: false },
  { id: 'journal', name: 'Journal Vouchers', description: 'Adjustments and corrections', included: false }
]

export default function TallyExportPage() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState | null>(null)
  const [exportData, setExportData] = useState<TallyExportData>({
    expenses: 0,
    sales: 0,
    handBills: 0,
    cashTransactions: 0,
    estimated: true
  })
  
  // Export Configuration
  const [selectedFormat, setSelectedFormat] = useState('xml')
  const [selectedVouchers, setSelectedVouchers] = useState<string[]>([
    'sales', 'purchase', 'payment', 'receipt'
  ])
  const [includeGST, setIncludeGST] = useState(true)
  const [groupByStore, setGroupByStore] = useState(true)
  
  // Load export data preview
  useEffect(() => {
    if (!filters || !profile || !accessibleStores || accessibleStores.length === 0) {
      return
    }
    
    loadExportPreview()
  }, [filters, profile, accessibleStores])

  const loadExportPreview = async () => {
    try {
      setLoading(true)
      
      const fromDate = format(filters!.dateRange.from, 'yyyy-MM-dd')
      const toDate = format(filters!.dateRange.to, 'yyyy-MM-dd')
      
      // Get user's accessible stores
      const userStoreIds = accessibleStores.map(store => store.id)
      
      // Determine store filter based on selection
      let storeFilter: string[] | null = null
      if (filters!.storeId === null) {
        storeFilter = userStoreIds
      } else {
        storeFilter = [filters!.storeId]
      }
      
      const preview = await getTallyExportPreview({
        dateFrom: fromDate,
        dateTo: toDate,
        storeIds: storeFilter,
        voucherTypes: ['sales', 'payment', 'receipt', 'journal'] // Get counts for all data types
      })
      
      setExportData({
        expenses: preview.expenses,
        sales: preview.sales,
        handBills: preview.handBills,
        cashTransactions: preview.returns, // Using returns data for cash transactions
        estimated: false
      })
    } catch (error) {
      console.error('Error loading export preview:', error)
      toast.error('Failed to load export preview')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    if (!filters) {
      toast.error('Please select date range and filters')
      return
    }
    
    try {
      setLoading(true)
      
      const fromDate = format(filters.dateRange.from, 'yyyy-MM-dd')
      const toDate = format(filters.dateRange.to, 'yyyy-MM-dd')
      
      // Get user's accessible stores
      const userStoreIds = accessibleStores.map(store => store.id)
      
      // Determine store filter based on selection
      let storeFilter: string[] | null = null
      if (filters.storeId === null) {
        storeFilter = userStoreIds
      } else {
        storeFilter = [filters.storeId]
      }
      
      const exportConfig: TallyExportConfig = {
        dateFrom: fromDate,
        dateTo: toDate,
        storeIds: storeFilter,
        format: selectedFormat as 'xml' | 'excel' | 'csv',
        voucherTypes: selectedVouchers as ('sales' | 'purchase' | 'payment' | 'receipt' | 'contra' | 'journal')[],
        includeGST,
        groupByStore
      }
      
      console.log('Exporting with config:', exportConfig)
      
      // Generate the export file
      const result = await generateTallyExport(exportConfig)
      
      // Create blob and download
      const mimeType = selectedFormat === 'xml' 
        ? 'application/xml' 
        : selectedFormat === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      
      const blob = new Blob([result.content], { type: mimeType })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Export completed successfully!')
      
    } catch (error) {
      console.error('Error during export:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  const toggleVoucher = (voucherId: string) => {
    setSelectedVouchers(prev => 
      prev.includes(voucherId) 
        ? prev.filter(id => id !== voucherId)
        : [...prev, voucherId]
    )
  }

  const selectedFormatData = exportFormats.find(f => f.id === selectedFormat)

  return (
    <PermissionGuard permission={Permission.EXPORT_DATA}>
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            {/* Page Header */}
            <div className="flex items-center gap-4 mb-8">
              <Link href="/reports">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <h2 className="text-3xl font-bold tracking-tight">Tally Export</h2>
                <p className="text-muted-foreground">
                  Export transaction data in Tally-compatible formats for easy accounting integration
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="h-3 w-3 mr-1" />
                Popular Export
              </Badge>
            </div>

            {/* Filter Bar */}
            <FilterBar 
              onFiltersChange={handleFiltersChange} 
              showStoreFilter={true}
              showDateFilter={true}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Export Configuration */}
              <div className="lg:col-span-2 space-y-6">
                
                <Card>
                  <CardHeader>
                    <CardTitle>Export Configuration</CardTitle>
                    <CardDescription>
                      Configure your Tally export settings and data format preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="format" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="format">Format</TabsTrigger>
                        <TabsTrigger value="vouchers">Voucher Types</TabsTrigger>
                        <TabsTrigger value="options">Advanced</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="format" className="space-y-4">
                        <div className="space-y-4">
                          <Label>Export Format</Label>
                          <div className="grid gap-3">
                            {exportFormats.map((format) => (
                              <Card 
                                key={format.id}
                                className={`cursor-pointer transition-colors ${
                                  selectedFormat === format.id ? 'ring-2 ring-primary' : ''
                                }`}
                                onClick={() => setSelectedFormat(format.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-4 h-4 rounded-full border-2 ${
                                        selectedFormat === format.id 
                                          ? 'bg-primary border-primary' 
                                          : 'border-muted-foreground'
                                      }`} />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="font-medium">{format.name}</p>
                                          {format.recommended && (
                                            <Badge variant="secondary" className="text-xs">
                                              Recommended
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {format.description}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {format.extension}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="vouchers" className="space-y-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Voucher Types to Export</Label>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedVouchers(['sales', 'purchase', 'payment', 'receipt'])}
                            >
                              Select Recommended
                            </Button>
                          </div>
                          <div className="space-y-3">
                            {voucherTypes.map((voucher) => (
                              <div key={voucher.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                                <Checkbox
                                  id={voucher.id}
                                  checked={selectedVouchers.includes(voucher.id)}
                                  onCheckedChange={() => toggleVoucher(voucher.id)}
                                />
                                <div className="flex-1">
                                  <Label htmlFor={voucher.id} className="text-sm font-medium cursor-pointer">
                                    {voucher.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {voucher.description}
                                  </p>
                                </div>
                                {voucher.included && (
                                  <Badge variant="secondary" className="text-xs">
                                    Common
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="options" className="space-y-4">
                        <div className="space-y-4">
                          <Label>Advanced Options</Label>
                          
                          <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="include-gst" 
                                checked={includeGST}
                                onCheckedChange={(checked) => setIncludeGST(!!checked)}
                              />
                              <Label htmlFor="include-gst" className="text-sm">
                                Include GST calculations and tax breakdowns
                              </Label>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="group-by-store" 
                                checked={groupByStore}
                                onCheckedChange={(checked) => setGroupByStore(!!checked)}
                              />
                              <Label htmlFor="group-by-store" className="text-sm">
                                Group transactions by store location
                              </Label>
                            </div>
                            
                            <div className="pt-4 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                <Label className="text-sm font-medium">Tally Integration Tips</Label>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <p>• Import XML files through Gateway of Tally → Import Data</p>
                                <p>• Ensure your Tally company's financial year matches the export period</p>
                                <p>• Review all vouchers after import for accuracy</p>
                                <p>• Keep backup of your Tally data before importing</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
                
              </div>

              {/* Export Preview & Actions */}
              <div className="space-y-6">
                
                {/* Export Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Export Preview
                    </CardTitle>
                    <CardDescription>
                      Data summary for selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading && filters ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="ml-2 text-sm">Loading preview...</span>
                      </div>
                    ) : filters ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sales:</span>
                            <span className="font-medium">{exportData.sales}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expenses:</span>
                            <span className="font-medium">{exportData.expenses}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Hand Bills:</span>
                            <span className="font-medium">{exportData.handBills}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cash Trans:</span>
                            <span className="font-medium">{exportData.cashTransactions}</span>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t">
                          <div className="flex justify-between text-sm font-medium">
                            <span>Total Records:</span>
                            <span>
                              {(exportData.sales || 0) + (exportData.expenses || 0) + (exportData.handBills || 0) + (exportData.cashTransactions || 0)}
                            </span>
                          </div>
                        </div>
                        
                        {exportData.estimated && (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Preview data (actual export may vary)</span>
                          </div>
                        )}
                        
                        {!exportData.estimated && (
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded text-xs text-green-700">
                            <CheckCircle className="h-3 w-3" />
                            <span>Real-time data from database</span>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="h-3 w-3" />
                            <span>Format: {selectedFormatData?.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Voucher Types: {selectedVouchers.length} selected</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Select date range to preview export data
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Export Action */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ready to Export</CardTitle>
                    <CardDescription>
                      Generate and download your Tally-compatible file
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={handleExport}
                      disabled={loading || !filters}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Export...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export to Tally
                        </>
                      )}
                    </Button>
                    
                    {!filters && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Please select date range and filters above
                      </p>
                    )}
                  </CardContent>
                </Card>
                
              </div>
            </div>
          </main>
        </div>
      </div>
    </PermissionGuard>
  )
}