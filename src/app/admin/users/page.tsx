"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ArrowLeft, Users, UserPlus, Shield, Mail, Building, Trash2, Edit, Plus, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { PermissionGuard } from "@/components/auth/PermissionGuard"
import { Permission, UserRole, getRoleDisplayName, getRoleColor } from "@/lib/permissions"
import { getAllStores, assignUsersToStore, type Store } from "@/lib/store-service"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  role: UserRole
  default_store_id?: string
  is_active: boolean
  created_at: string
  stores?: {
    store_name: string
    store_code: string
  }
}

interface WhitelistEntry {
  id: string
  email?: string
  domain?: string
  assigned_role?: UserRole
  assigned_store_ids?: string[]
  notes?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  added_by?: string
}

export default function UserManagementPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("")
  const [newWhitelistDomain, setNewWhitelistDomain] = useState("")
  const [newWhitelistRole, setNewWhitelistRole] = useState<UserRole>(UserRole.CASHIER)
  const [newWhitelistStores, setNewWhitelistStores] = useState<string[]>([])
  const [newWhitelistNotes, setNewWhitelistNotes] = useState("")
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [showAddWhitelist, setShowAddWhitelist] = useState(false)
  const [showStoreAssignment, setShowStoreAssignment] = useState(false)
  const [selectedUserForStore, setSelectedUserForStore] = useState<UserProfile | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadUsers()
    loadWhitelist()
    loadStores()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, stores:default_store_id(store_name, store_code)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const loadWhitelist = async () => {
    try {
      const { data, error } = await supabase
        .from('email_whitelist')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setWhitelist(data || [])
    } catch (error) {
      console.error('Error loading whitelist:', error)
      toast.error('Failed to load whitelist')
    }
  }

  const loadStores = async () => {
    try {
      const storesData = await getAllStores()
      setStores(storesData)
    } catch (error) {
      console.error('Error loading stores:', error)
      toast.error('Failed to load stores')
    }
  }

  const addToWhitelist = async (type: 'email' | 'domain') => {
    const value = type === 'email' ? newWhitelistEmail : newWhitelistDomain
    if (!value.trim()) {
      toast.error(`Please enter a valid ${type}`)
      return
    }

    // Validate store assignment for Store Managers and Cashiers
    if ((newWhitelistRole === UserRole.STORE_MANAGER || newWhitelistRole === UserRole.CASHIER) && 
        newWhitelistStores.length === 0) {
      toast.error(`${getRoleDisplayName(newWhitelistRole)}s must be assigned to at least one store`)
      return
    }

    try {
      const insertData: any = type === 'email' 
        ? { email: value.trim().toLowerCase() }
        : { domain: value.trim().toLowerCase() }
      
      // Add role and store assignments
      insertData.assigned_role = newWhitelistRole
      // Only include store assignments for Store Managers and Cashiers
      insertData.assigned_store_ids = (newWhitelistRole === UserRole.SUPER_USER || newWhitelistRole === UserRole.ACCOUNTS_INCHARGE) 
        ? [] 
        : newWhitelistStores
      insertData.notes = newWhitelistNotes.trim()
      insertData.added_by = profile?.id

      const { error } = await supabase
        .from('email_whitelist')
        .insert([insertData])

      if (error) throw error

      toast.success(`${type === 'email' ? 'Email' : 'Domain'} added to whitelist with ${getRoleDisplayName(newWhitelistRole)} role`)
      setNewWhitelistEmail("")
      setNewWhitelistDomain("")
      setNewWhitelistRole(UserRole.CASHIER)
      setNewWhitelistStores([])
      setNewWhitelistNotes("")
      setShowAddWhitelist(false)
      loadWhitelist()
    } catch (error: any) {
      console.error('Error adding to whitelist:', error)
      if (error.code === '23505') {
        toast.error(`${type === 'email' ? 'Email' : 'Domain'} already exists in whitelist`)
      } else {
        toast.error('Failed to add to whitelist')
      }
    }
  }

  const toggleWhitelistStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_whitelist')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      toast.success(`Whitelist entry ${!currentStatus ? 'enabled' : 'disabled'}`)
      loadWhitelist()
    } catch (error) {
      console.error('Error updating whitelist status:', error)
      toast.error('Failed to update whitelist status')
    }
  }

  const deleteWhitelistEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_whitelist')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Whitelist entry deleted')
      loadWhitelist()
    } catch (error) {
      console.error('Error deleting whitelist entry:', error)
      toast.error('Failed to delete whitelist entry')
    }
  }

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success('User role updated successfully')
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error('Failed to update user role')
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`)
      loadUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const handleStoreAssignment = async (storeId: string) => {
    if (!selectedUserForStore) return

    try {
      await assignUsersToStore(storeId, [selectedUserForStore.id])
      toast.success(`User assigned to ${stores.find(s => s.id === storeId)?.store_name}`)
      setShowStoreAssignment(false)
      setSelectedUserForStore(null)
      loadUsers()
    } catch (error: any) {
      console.error('Error assigning user to store:', error)
      toast.error(error.message || 'Failed to assign user to store')
    }
  }

  const openStoreAssignment = (user: UserProfile) => {
    setSelectedUserForStore(user)
    setShowStoreAssignment(true)
  }

  const getStoreName = (storeId?: string, userStoreData?: { store_name: string, store_code: string }) => {
    if (!storeId) return 'No Store Assigned'
    
    // Use joined store data if available
    if (userStoreData) {
      return `${userStoreData.store_name} (${userStoreData.store_code})`
    }
    
    // Fallback to searching in stores array
    const store = stores.find(s => s.id === storeId)
    return store ? `${store.store_name} (${store.store_code})` : 'Unknown Store'
  }

  return (
    <PermissionGuard permission={Permission.VIEW_ALL_USERS}>
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
                <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
                <p className="text-muted-foreground">
                  Manage user accounts, roles, and email whitelist
                </p>
              </div>
            </div>

            <Tabs defaultValue="users" className="space-y-6">
              <TabsList>
                <TabsTrigger value="users">
                  <Users className="mr-2 h-4 w-4" />
                  Users ({users.length})
                </TabsTrigger>
                <TabsTrigger value="whitelist">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Whitelist ({whitelist.length})
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      System Users
                    </CardTitle>
                    <CardDescription>
                      View and manage user accounts and their roles
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Store</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {users.map((user) => (
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
                                  <div className="text-sm">
                                    {getStoreName(user.default_store_id, user.stores)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={user.is_active ? "success" : "secondary"}>
                                    {user.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => setEditingUser(user)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Edit User Role</DialogTitle>
                                          <DialogDescription>
                                            Change the role for {user.email}
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div>
                                            <Label>Current Role</Label>
                                            <div className="mt-1">
                                              <Badge className={getRoleColor(user.role)}>
                                                {getRoleDisplayName(user.role)}
                                              </Badge>
                                            </div>
                                          </div>
                                          <div>
                                            <Label htmlFor="new-role">New Role</Label>
                                            <Select onValueChange={(value: UserRole) => updateUserRole(user.id, value)}>
                                              <SelectTrigger>
                                                <SelectValue placeholder="Select new role" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="super_user">Super User</SelectItem>
                                                <SelectItem value="accounts_incharge">Accounts Incharge</SelectItem>
                                                <SelectItem value="store_manager">Store Manager</SelectItem>
                                                <SelectItem value="cashier">Cashier</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openStoreAssignment(user)}
                                      title="Assign Store"
                                    >
                                      <Building className="h-3 w-3" />
                                    </Button>
                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                                    >
                                      {user.is_active ? 
                                        <EyeOff className="h-3 w-3" /> : 
                                        <Eye className="h-3 w-3" />
                                      }
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Whitelist Tab */}
              <TabsContent value="whitelist" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5" />
                          Email Whitelist
                        </CardTitle>
                        <CardDescription>
                          Manage which emails and domains can sign up for the system
                        </CardDescription>
                      </div>
                      <Dialog open={showAddWhitelist} onOpenChange={setShowAddWhitelist}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add to Whitelist
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add to Whitelist</DialogTitle>
                            <DialogDescription>
                              Add an email address or domain with pre-assigned role and store access
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <Tabs defaultValue="email" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="email">Email</TabsTrigger>
                                <TabsTrigger value="domain">Domain</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="email" className="space-y-4">
                                <div>
                                  <Label htmlFor="email">Email Address *</Label>
                                  <Input
                                    id="email"
                                    placeholder="user@company.com"
                                    value={newWhitelistEmail}
                                    onChange={(e) => setNewWhitelistEmail(e.target.value)}
                                  />
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="domain" className="space-y-4">
                                <div>
                                  <Label htmlFor="domain">Domain *</Label>
                                  <Input
                                    id="domain"
                                    placeholder="company.com"
                                    value={newWhitelistDomain}
                                    onChange={(e) => setNewWhitelistDomain(e.target.value)}
                                  />
                                </div>
                              </TabsContent>
                            </Tabs>

                            {/* Role Selection */}
                            <div>
                              <Label htmlFor="role">Assigned Role *</Label>
                              <Select 
                                value={newWhitelistRole} 
                                onValueChange={(value) => {
                                  setNewWhitelistRole(value as UserRole)
                                  // Clear store selection when switching to SU or AIC
                                  if (value === UserRole.SUPER_USER || value === UserRole.ACCOUNTS_INCHARGE) {
                                    setNewWhitelistStores([])
                                  }
                                }}
                              >
                                <SelectTrigger id="role">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={UserRole.CASHIER}>Cashier</SelectItem>
                                  <SelectItem value={UserRole.STORE_MANAGER}>Store Manager</SelectItem>
                                  <SelectItem value={UserRole.ACCOUNTS_INCHARGE}>Accounts Incharge</SelectItem>
                                  {profile?.role === UserRole.SUPER_USER && (
                                    <SelectItem value={UserRole.SUPER_USER}>Super User</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground mt-1">
                                User will be assigned this role when they first login
                              </p>
                            </div>

                            {/* Store Selection - Only for Store Managers and Cashiers */}
                            {(newWhitelistRole === UserRole.STORE_MANAGER || newWhitelistRole === UserRole.CASHIER) ? (
                              <div>
                                <Label htmlFor="stores">Assigned Stores *</Label>
                                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                                  {stores.filter(s => s.is_active).map((store) => (
                                    <div key={store.id} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`store-${store.id}`}
                                        checked={newWhitelistStores.includes(store.id)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setNewWhitelistStores([...newWhitelistStores, store.id])
                                          } else {
                                            setNewWhitelistStores(newWhitelistStores.filter(id => id !== store.id))
                                          }
                                        }}
                                        className="rounded border-gray-300"
                                      />
                                      <Label htmlFor={`store-${store.id}`} className="font-normal cursor-pointer">
                                        {store.store_name} ({store.store_code})
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Store Managers and Cashiers must be assigned to at least one store
                                </p>
                              </div>
                            ) : (
                              <div className="p-4 bg-muted rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Shield className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">Automatic Store Access</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {newWhitelistRole === UserRole.SUPER_USER 
                                    ? "Super Users automatically have access to all stores in the system"
                                    : "Accounts Incharge automatically have access to all stores for financial oversight"}
                                </p>
                              </div>
                            )}

                            {/* Notes */}
                            <div>
                              <Label htmlFor="notes">Notes (Optional)</Label>
                              <Input
                                id="notes"
                                placeholder="e.g., Temporary access for audit"
                                value={newWhitelistNotes}
                                onChange={(e) => setNewWhitelistNotes(e.target.value)}
                              />
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowAddWhitelist(false)
                                  setNewWhitelistEmail("")
                                  setNewWhitelistDomain("")
                                  setNewWhitelistRole(UserRole.CASHIER)
                                  setNewWhitelistStores([])
                                  setNewWhitelistNotes("")
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  const type = newWhitelistEmail.trim() ? 'email' : 'domain'
                                  addToWhitelist(type)
                                }}
                                disabled={!newWhitelistEmail.trim() && !newWhitelistDomain.trim()}
                              >
                                Add to Whitelist
                              </Button>
                            </DialogFooter>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Assigned Role</TableHead>
                            <TableHead>Stores</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {whitelist.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {entry.email ? 'Email' : 'Domain'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono">
                                {entry.email || entry.domain}
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={getRoleColor(entry.assigned_role || UserRole.CASHIER)}>
                                  <Shield className="mr-1 h-3 w-3" />
                                  {getRoleDisplayName(entry.assigned_role || UserRole.CASHIER)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {(entry.assigned_role === UserRole.SUPER_USER || entry.assigned_role === UserRole.ACCOUNTS_INCHARGE) ? (
                                  <Badge variant="default" className="bg-primary/10 text-primary">
                                    <Building className="mr-1 h-3 w-3" />
                                    All Stores
                                  </Badge>
                                ) : entry.assigned_store_ids && entry.assigned_store_ids.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {entry.assigned_store_ids.slice(0, 2).map((storeId) => {
                                      const store = stores.find(s => s.id === storeId)
                                      return store ? (
                                        <Badge key={storeId} variant="outline" className="text-xs">
                                          {store.store_code}
                                        </Badge>
                                      ) : null
                                    })}
                                    {entry.assigned_store_ids.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{entry.assigned_store_ids.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">No stores assigned</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={entry.is_active ? "success" : "secondary"}>
                                  {entry.is_active ? 
                                    <>
                                      <CheckCircle className="mr-1 h-3 w-3" />
                                      Active
                                    </> : 
                                    <>
                                      <XCircle className="mr-1 h-3 w-3" />
                                      Inactive
                                    </>
                                  }
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(entry.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleWhitelistStatus(entry.id, entry.is_active)}
                                  >
                                    {entry.is_active ? 
                                      <EyeOff className="h-3 w-3" /> : 
                                      <Eye className="h-3 w-3" />
                                    }
                                  </Button>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Whitelist Entry</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{entry.email || entry.domain}"? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => deleteWhitelistEntry(entry.id)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>

        {/* Store Assignment Dialog */}
        <Dialog open={showStoreAssignment} onOpenChange={setShowStoreAssignment}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Store</DialogTitle>
              <DialogDescription>
                Assign {selectedUserForStore?.email} to a store
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Current Store</Label>
                <div className="mt-1 text-sm text-muted-foreground">
                  {selectedUserForStore ? getStoreName(selectedUserForStore.default_store_id, selectedUserForStore.stores) : 'None'}
                </div>
              </div>
              <div>
                <Label htmlFor="store-select">Select Store</Label>
                <Select onValueChange={handleStoreAssignment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.store_name} ({store.store_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStoreAssignment(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  )
}