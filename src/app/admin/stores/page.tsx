"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Edit, Trash2, Store, Phone, Mail, Users, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission, UserRole, getRoleDisplayName, getRoleColor } from "@/lib/permissions"
import { 
  createStore, 
  updateStore, 
  deleteStore, 
  toggleStoreStatus, 
  getAllStoresWithStats, 
  getStoreUsers,
  assignUsersToStore,
  validateStoreCode,
  type StoreWithStats 
} from "@/lib/store-service"
import { getAllUsers } from "@/lib/user-service"

export default function StoreManagementPage() {
  const [stores, setStores] = useState<StoreWithStats[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [selectedStoreUsers, setSelectedStoreUsers] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreWithStats | null>(null)
  const [selectedStore, setSelectedStore] = useState<StoreWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    store_code: '',
    store_name: '',
    address: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    loadStores()
    loadUsers()
  }, [])

  const loadStores = async () => {
    try {
      setLoading(true)
      const storesData = await getAllStoresWithStats()
      setStores(storesData)
    } catch (error) {
      console.error('Error loading stores:', error)
      toast.error('Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const usersData = await getAllUsers()
      setAllUsers(usersData)
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const loadStoreUsers = async (storeId: string) => {
    try {
      const users = await getStoreUsers(storeId)
      setSelectedStoreUsers(users)
    } catch (error) {
      console.error('Error loading store users:', error)
      toast.error('Failed to load store users')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      // Validate store code
      if (!await validateStoreCode(formData.store_code)) {
        toast.error("Store code must be 3-10 uppercase letters/numbers (e.g., MAIN, CBD01)")
        return
      }

      if (editingStore) {
        // Update existing store
        await updateStore(editingStore.id, {
          store_code: formData.store_code.toUpperCase(),
          store_name: formData.store_name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email
        })
        toast.success("Store updated successfully!")
      } else {
        // Create new store
        await createStore({
          store_code: formData.store_code.toUpperCase(),
          store_name: formData.store_name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          is_active: true
        })
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
      loadStores() // Reload stores
    } catch (error: any) {
      toast.error(error.message || "Failed to save store")
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (store: StoreWithStats) => {
    setEditingStore(store)
    setFormData({
      store_code: store.store_code,
      store_name: store.store_name,
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || ''
    })
    setIsDialogOpen(true)
  }

  const handleToggleStatus = async (store: StoreWithStats) => {
    try {
      await toggleStoreStatus(store.id)
      toast.success(`Store ${store.is_active ? 'deactivated' : 'activated'}`)
      loadStores() // Reload stores
    } catch (error: any) {
      toast.error(error.message || "Failed to update store status")
    }
  }

  const handleDeleteStore = async (store: StoreWithStats) => {
    try {
      await deleteStore(store.id)
      toast.success("Store deleted successfully")
      loadStores() // Reload stores
    } catch (error: any) {
      toast.error(error.message || "Failed to delete store")
    }
  }

  const handleViewStoreUsers = async (store: StoreWithStats) => {
    setSelectedStore(store)
    await loadStoreUsers(store.id)
    setIsUserDialogOpen(true)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <PermissionGuard permission={Permission.VIEW_ALL_STORES}>
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
                  Manage store locations, details, and user assignments
                </p>
              </div>
              <PermissionGuard permission={Permission.CREATE_STORE}>
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
                    <Button type="submit" disabled={formLoading}>
                      {formLoading ? 'Saving...' : (editingStore ? 'Update Store' : 'Create Store')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
              </PermissionGuard>
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
                      <TableHead>Users</TableHead>
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
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {store.stats?.active_users || 0} / {store.stats?.total_users || 0} Active
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{store.stats?.managers || 0} Managers</span>
                              <span>•</span>
                              <span>{store.stats?.cashiers || 0} Cashiers</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(store)}
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
                              onClick={() => handleViewStoreUsers(store)}
                              title="View store users"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <PermissionGuard permission={Permission.EDIT_STORE}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(store)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </PermissionGuard>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(store)}
                              className={store.is_active ? "text-orange-600" : "text-green-600"}
                            >
                              {store.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <PermissionGuard permission={Permission.DELETE_STORE}>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Store</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{store.store_name}"? 
                                      This action cannot be undone and will fail if users are assigned to this store.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteStore(store)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </PermissionGuard>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store Users Dialog */}
          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedStore?.store_name} - Assigned Users
                </DialogTitle>
                <DialogDescription>
                  Users assigned to {selectedStore?.store_name} ({selectedStore?.store_code})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {selectedStore?.stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{selectedStore.stats.total_users}</div>
                        <div className="text-sm text-muted-foreground">Total Users</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{selectedStore.stats.active_users}</div>
                        <div className="text-sm text-muted-foreground">Active Users</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{selectedStore.stats.managers}</div>
                        <div className="text-sm text-muted-foreground">Managers</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-gray-600">{selectedStore.stats.cashiers}</div>
                        <div className="text-sm text-muted-foreground">Cashiers</div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStoreUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.full_name || 'No Name'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleColor(user.role)}>
                              {getRoleDisplayName(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? "default" : "secondary"}>
                              {user.is_active ? (
                                <>
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {selectedStoreUsers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No users assigned to this store
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </main>
        </div>
      </div>
    </PermissionGuard>
  )
}