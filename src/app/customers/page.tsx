"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Users, Plus, Search, Edit, Phone, Mail, Calendar, ShoppingBag } from "lucide-react"
import { toast } from "sonner"

const mockCustomers = [
  {
    id: "1",
    name: "Rahul Sharma",
    phone: "+91 9876543001",
    email: "rahul.sharma@example.com",
    total_purchases: 5,
    total_amount: 12500.00,
    last_purchase: "2025-01-20",
    created_at: "2024-12-15T10:30:00Z"
  },
  {
    id: "2",
    name: "Priya Patel",
    phone: "+91 9876543002",
    email: "priya.patel@example.com",
    total_purchases: 8,
    total_amount: 18750.00,
    last_purchase: "2025-01-19",
    created_at: "2024-11-22T14:20:00Z"
  },
  {
    id: "3",
    name: "Amit Kumar",
    phone: "+91 9876543003",
    email: "",
    total_purchases: 3,
    total_amount: 7200.00,
    last_purchase: "2025-01-18",
    created_at: "2025-01-10T09:15:00Z"
  },
  {
    id: "4", 
    name: "Sneha Singh",
    phone: "+91 9876543004",
    email: "sneha.singh@example.com",
    total_purchases: 12,
    total_amount: 25600.00,
    last_purchase: "2025-01-15",
    created_at: "2024-10-05T16:45:00Z"
  },
  {
    id: "5",
    name: "Vikram Gupta", 
    phone: "+91 9876543005",
    email: "vikram.gupta@example.com",
    total_purchases: 2,
    total_amount: 3400.00,
    last_purchase: "2024-12-20",
    created_at: "2024-12-01T11:10:00Z"
  }
]

export default function CustomersPage() {
  const [customers, setCustomers] = useState(mockCustomers)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  })

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingCustomer) {
        setCustomers(prev => prev.map(customer => 
          customer.id === editingCustomer.id 
            ? { ...customer, ...formData, updated_at: new Date().toISOString() }
            : customer
        ))
        toast.success("Customer updated successfully!")
      } else {
        const existingCustomer = customers.find(c => c.phone === formData.phone)
        if (existingCustomer) {
          toast.error("Customer with this phone number already exists")
          setLoading(false)
          return
        }
        
        const newCustomer = {
          id: String(customers.length + 1),
          ...formData,
          total_purchases: 0,
          total_amount: 0,
          last_purchase: null,
          created_at: new Date().toISOString()
        }
        setCustomers(prev => [...prev, newCustomer])
        toast.success("Customer created successfully!")
      }

      setFormData({ name: '', phone: '', email: '' })
      setEditingCustomer(null)
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Failed to save customer. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email
    })
    setIsDialogOpen(true)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const totalCustomers = customers.length
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_amount, 0)
  const avgPurchaseValue = totalRevenue / customers.reduce((sum, c) => sum + c.total_purchases, 0) || 0

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:block w-64 border-r">
        <Sidebar />
      </aside>
      
      <div className="flex-1">
        <Header />
        
        <main className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
              <p className="text-muted-foreground">
                Manage customer database and purchase history
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCustomer(null)
                  setFormData({ name: '', phone: '', email: '' })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCustomer 
                      ? 'Update customer information'
                      : 'Add a new customer to the database'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Customer full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                    />
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
                      {loading ? 'Saving...' : (editingCustomer ? 'Update' : 'Create')}
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
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
                <p className="text-xs text-muted-foreground">
                  Registered customers
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  From customer purchases
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Purchase Value</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(avgPurchaseValue)}</div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Customer Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
                  <CardDescription>
                    Customer database with purchase history
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[300px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Details</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Purchase History</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Last Purchase</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                              <Users className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Since {new Date(customer.created_at).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <p className="text-sm font-medium">{customer.phone}</p>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{customer.total_purchases}</p>
                            <p className="text-xs text-muted-foreground">transactions</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{formatCurrency(customer.total_amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              Avg: {formatCurrency(customer.total_purchases > 0 ? customer.total_amount / customer.total_purchases : 0)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.last_purchase ? (
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(customer.last_purchase).toLocaleDateString('en-IN')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {Math.ceil((new Date().getTime() - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24))} days ago
                              </p>
                            </div>
                          ) : (
                            <Badge variant="outline">No purchases</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No customers match your search" : "No customers found"}
                  </p>
                  {!searchTerm && (
                    <Button className="mt-2" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Customer
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}