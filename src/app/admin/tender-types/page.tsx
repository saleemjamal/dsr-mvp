"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Plus, Edit, Trash2, CreditCard, Banknote, Smartphone, Gift, Building } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Mock tender types with usage statistics
const mockTenderTypes = [
  {
    id: "1",
    code: "cash",
    name: "Cash",
    description: "Physical cash payments",
    icon: "Banknote",
    is_active: true,
    requires_reference: false,
    usage_count: 156,
    total_amount: 450000,
    created_at: "2025-01-10T10:30:00Z"
  },
  {
    id: "2", 
    code: "upi",
    name: "UPI Payment",
    description: "Unified Payments Interface - PhonePe, GPay, Paytm",
    icon: "Smartphone",
    is_active: true,
    requires_reference: true,
    usage_count: 142,
    total_amount: 380000,
    created_at: "2025-01-10T10:30:00Z"
  },
  {
    id: "3",
    code: "credit_card",
    name: "Credit Card",
    description: "Credit/Debit card payments",
    icon: "CreditCard",
    is_active: true,
    requires_reference: true,
    usage_count: 89,
    total_amount: 320000,
    created_at: "2025-01-10T10:30:00Z"
  },
  {
    id: "4",
    code: "gift_voucher",
    name: "Gift Voucher",
    description: "Gift voucher redemptions",
    icon: "Gift",
    is_active: true,
    requires_reference: true,
    usage_count: 34,
    total_amount: 85000,
    created_at: "2025-01-10T10:30:00Z"
  },
  {
    id: "5",
    code: "bank_transfer",
    name: "Bank Transfer",
    description: "Direct bank transfers and NEFT/RTGS",
    icon: "Building",
    is_active: false,
    requires_reference: true,
    usage_count: 12,
    total_amount: 125000,
    created_at: "2025-01-10T10:30:00Z"
  }
]

const iconComponents: Record<string, any> = {
  Banknote,
  Smartphone,
  CreditCard,
  Gift,
  Building
}

export default function TenderTypesManagementPage() {
  const [tenderTypes, setTenderTypes] = useState(mockTenderTypes)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<typeof mockTenderTypes[0] | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: 'CreditCard',
    requires_reference: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingType) {
        // Update existing type
        setTenderTypes(prev => prev.map(type => 
          type.id === editingType.id 
            ? { ...type, ...formData, updated_at: new Date().toISOString() }
            : type
        ))
        toast.success("Payment method updated successfully!")
      } else {
        // Create new type
        const newType = {
          id: String(tenderTypes.length + 1),
          ...formData,
          is_active: true,
          usage_count: 0,
          total_amount: 0,
          created_at: new Date().toISOString()
        }
        setTenderTypes(prev => [...prev, newType])
        toast.success("Payment method created successfully!")
      }

      // Reset form and close dialog
      setFormData({
        code: '',
        name: '',
        description: '',
        icon: 'CreditCard',
        requires_reference: false
      })
      setEditingType(null)
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Failed to save payment method. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (type: typeof mockTenderTypes[0]) => {
    setEditingType(type)
    setFormData({
      code: type.code,
      name: type.name,
      description: type.description,
      icon: type.icon,
      requires_reference: type.requires_reference
    })
    setIsDialogOpen(true)
  }

  const handleToggleStatus = async (typeId: string) => {
    try {
      setTenderTypes(prev => prev.map(type => 
        type.id === typeId 
          ? { ...type, is_active: !type.is_active }
          : type
      ))
      toast.success("Payment method status updated!")
    } catch (error) {
      toast.error("Failed to update payment method status")
    }
  }

  const handleDelete = (typeId: string) => {
    const type = tenderTypes.find(t => t.id === typeId)
    
    if (type && type.usage_count > 0) {
      toast.error("Cannot delete payment method that has been used in transactions")
      return
    }
    
    if (confirm('Are you sure you want to delete this payment method?')) {
      setTenderTypes(prev => prev.filter(t => t.id !== typeId))
      toast.success('Payment method deleted successfully')
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const activeTypes = tenderTypes.filter(t => t.is_active).length
  const totalUsage = tenderTypes.reduce((sum, t) => sum + t.usage_count, 0)

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      {/* Main Content */}
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1">
              <h2 className="text-3xl font-bold tracking-tight">Payment Methods</h2>
              <p className="text-muted-foreground">
                Configure tender types and payment options available in the system
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingType(null)
                  setFormData({
                    code: '',
                    name: '',
                    description: '',
                    icon: 'CreditCard',
                    requires_reference: false
                  })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingType ? 'Edit Payment Method' : 'Add New Payment Method'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingType 
                      ? 'Update payment method configuration'
                      : 'Create a new payment method for transactions'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        placeholder="e.g., crypto"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Cryptocurrency"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this payment method"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <select
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => handleInputChange('icon', e.target.value)}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md"
                    >
                      <option value="CreditCard">Credit Card</option>
                      <option value="Banknote">Banknote</option>
                      <option value="Smartphone">Smartphone</option>
                      <option value="Gift">Gift</option>
                      <option value="Building">Building</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_reference"
                      checked={formData.requires_reference}
                      onCheckedChange={(checked) => handleInputChange('requires_reference', checked)}
                    />
                    <Label htmlFor="requires_reference">Requires Transaction Reference</Label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : (editingType ? 'Update' : 'Create')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tenderTypes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeTypes} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                <Badge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsage}</div>
                <p className="text-xs text-muted-foreground">
                  Total usage count
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Popular</CardTitle>
                <Badge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tenderTypes.sort((a, b) => b.usage_count - a.usage_count)[0]?.name || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Most used method
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Current Tender Types */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Currently Available Payment Methods</CardTitle>
              <CardDescription>These are the payment methods users can select during transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {tenderTypes.filter(t => t.is_active).map((type) => {
                  const IconComponent = iconComponents[type.icon] || CreditCard
                  return (
                    <div key={type.id} className="flex flex-col items-center p-4 border rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary mb-2" />
                      <span className="text-sm font-medium text-center">{type.name}</span>
                      <span className="text-xs text-muted-foreground">{type.usage_count} uses</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Payment Methods ({tenderTypes.length})</CardTitle>
              <CardDescription>
                Manage payment methods and track their usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Usage Statistics</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenderTypes
                      .sort((a, b) => b.usage_count - a.usage_count)
                      .map((type) => {
                        const IconComponent = iconComponents[type.icon] || CreditCard
                        return (
                      <TableRow key={type.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <IconComponent className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{type.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Code: {type.code}
                              </p>
                              {type.description && (
                                <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {type.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={type.requires_reference ? "default" : "secondary"}>
                              {type.requires_reference ? "Reference Required" : "No Reference"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-lg font-bold">{type.usage_count}</div>
                          <p className="text-xs text-muted-foreground">
                            transactions
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(type.total_amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(type.id)}
                            className={type.is_active ? "text-green-600" : "text-red-600"}
                          >
                            {type.is_active ? "Active" : "Inactive"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(type.id)}
                              disabled={type.usage_count > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Payment methods that have been used in transactions cannot be deleted. 
                  Deactivating a payment method will remove it from new transaction forms while preserving historical data.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}