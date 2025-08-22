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
import { ArrowLeft, Plus, Edit, Trash2, Store, Phone, Mail } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Mock stores data - replace with real Supabase data later
const mockStores = [
  {
    id: "1",
    store_code: "CBD",
    store_name: "CBD Store",
    address: "Central Business District, Mumbai",
    phone: "+91 98765 43210",
    email: "cbd@poppat.com",
    is_active: true,
    created_at: "2025-01-20T10:30:00Z"
  },
  {
    id: "2", 
    store_code: "FSN",
    store_name: "Fashion Store",
    address: "Fashion Street, Mumbai",
    phone: "+91 98765 43211",
    email: "fashion@poppat.com",
    is_active: true,
    created_at: "2025-01-19T09:15:00Z"
  },
  {
    id: "3",
    store_code: "HOME",
    store_name: "Home Store",
    address: "Home Decor District, Mumbai", 
    phone: "+91 98765 43212",
    email: "home@poppat.com",
    is_active: true,
    created_at: "2025-01-18T08:45:00Z"
  },
  {
    id: "4",
    store_code: "ELEC",
    store_name: "Electronics Store",
    address: "Electronics Market, Mumbai",
    phone: "+91 98765 43213", 
    email: "electronics@poppat.com",
    is_active: false,
    created_at: "2025-01-17T14:20:00Z"
  }
]

export default function StoreManagementPage() {
  const [stores, setStores] = useState(mockStores)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    store_code: '',
    store_name: '',
    address: '',
    phone: '',
    email: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingStore) {
        // Update existing store
        setStores(prev => prev.map(store => 
          store.id === editingStore.id 
            ? { ...store, ...formData, updated_at: new Date().toISOString() }
            : store
        ))
        toast.success("Store updated successfully!")
      } else {
        // Create new store
        const newStore = {
          id: String(stores.length + 1),
          ...formData,
          is_active: true,
          created_at: new Date().toISOString()
        }
        setStores(prev => [...prev, newStore])
        toast.success("Store created successfully!")
      }

      // Reset form and close dialog
      setFormData({
        store_code: '',
        store_name: '',
        address: '',
        phone: '',
        email: ''
      })
      setEditingStore(null)
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Failed to save store. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (store) => {
    setEditingStore(store)
    setFormData({
      store_code: store.store_code,
      store_name: store.store_name,
      address: store.address,
      phone: store.phone,
      email: store.email
    })
    setIsDialogOpen(true)
  }

  const handleToggleStatus = async (storeId: string) => {
    try {
      setStores(prev => prev.map(store => 
        store.id === storeId 
          ? { ...store, is_active: !store.is_active }
          : store
      ))
      toast.success("Store status updated!")
    } catch (error) {
      toast.error("Failed to update store status")
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

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
              <h2 className="text-3xl font-bold tracking-tight">Store Management</h2>
              <p className="text-muted-foreground">
                Manage store locations and their details
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingStore(null)
                  setFormData({
                    store_code: '',
                    store_name: '',
                    address: '',
                    phone: '',
                    email: ''
                  })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Store
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingStore ? 'Edit Store' : 'Add New Store'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStore 
                      ? 'Update store information and details'
                      : 'Create a new store location with contact details'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="store_code">Store Code *</Label>
                      <Input
                        id="store_code"
                        placeholder="e.g., CBD, FSN"
                        value={formData.store_code}
                        onChange={(e) => handleInputChange('store_code', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="store_name">Store Name *</Label>
                      <Input
                        id="store_name"
                        placeholder="e.g., CBD Store"
                        value={formData.store_name}
                        onChange={(e) => handleInputChange('store_name', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Full store address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="store@company.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
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
                      {loading ? 'Saving...' : (editingStore ? 'Update Store' : 'Create Store')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stores Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Stores ({stores.length})</CardTitle>
              <CardDescription>
                Manage all store locations and their operational details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Info</TableHead>
                      <TableHead>Contact Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Store className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{store.store_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Code: {store.store_code}
                              </p>
                              {store.address && (
                                <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                                  {store.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {store.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {store.phone}
                              </div>
                            )}
                            {store.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[150px]">{store.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(store.id)}
                            className={store.is_active ? "text-green-600" : "text-red-600"}
                          >
                            {store.is_active ? "Active" : "Inactive"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {new Date(store.created_at).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(store)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this store?')) {
                                  setStores(prev => prev.filter(s => s.id !== store.id))
                                  toast.success('Store deleted successfully')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}