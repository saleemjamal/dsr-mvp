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
import { ArrowLeft, Plus, Edit, Trash2, Tag, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Mock expense categories with usage statistics
const mockCategories = [
  {
    id: "1",
    name: "Staff Welfare",
    description: "Employee benefits, refreshments, and welfare expenses",
    is_active: true,
    usage_count: 45,
    total_amount: 25000,
    created_at: "2025-01-15T10:30:00Z"
  },
  {
    id: "2", 
    name: "Logistics",
    description: "Shipping, delivery, and transportation costs",
    is_active: true,
    usage_count: 32,
    total_amount: 18500,
    created_at: "2025-01-14T09:15:00Z"
  },
  {
    id: "3",
    name: "Utilities",
    description: "Electricity, water, internet, and other utility bills",
    is_active: true,
    usage_count: 28,
    total_amount: 42000,
    created_at: "2025-01-13T08:45:00Z"
  },
  {
    id: "4",
    name: "Office Supplies",
    description: "Stationery, equipment, and office maintenance",
    is_active: true,
    usage_count: 22,
    total_amount: 15000,
    created_at: "2025-01-12T14:20:00Z"
  },
  {
    id: "5",
    name: "Maintenance",
    description: "Store maintenance, repairs, and cleaning services",
    is_active: true,
    usage_count: 18,
    total_amount: 32000,
    created_at: "2025-01-11T11:10:00Z"
  },
  {
    id: "6",
    name: "Marketing",
    description: "Advertising, promotions, and marketing materials",
    is_active: false,
    usage_count: 5,
    total_amount: 8000,
    created_at: "2025-01-10T16:45:00Z"
  }
]

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState(mockCategories)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingCategory) {
        // Update existing category
        setCategories(prev => prev.map(category => 
          category.id === editingCategory.id 
            ? { ...category, ...formData, updated_at: new Date().toISOString() }
            : category
        ))
        toast.success("Category updated successfully!")
      } else {
        // Create new category
        const newCategory = {
          id: String(categories.length + 1),
          ...formData,
          is_active: true,
          usage_count: 0,
          total_amount: 0,
          created_at: new Date().toISOString()
        }
        setCategories(prev => [...prev, newCategory])
        toast.success("Category created successfully!")
      }

      // Reset form and close dialog
      setFormData({
        name: '',
        description: ''
      })
      setEditingCategory(null)
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Failed to save category. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description
    })
    setIsDialogOpen(true)
  }

  const handleToggleStatus = async (categoryId: string) => {
    try {
      setCategories(prev => prev.map(category => 
        category.id === categoryId 
          ? { ...category, is_active: !category.is_active }
          : category
      ))
      toast.success("Category status updated!")
    } catch (error) {
      toast.error("Failed to update category status")
    }
  }

  const handleDelete = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    
    if (category.usage_count > 0) {
      toast.error("Cannot delete category that has been used in expenses")
      return
    }
    
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(prev => prev.filter(c => c.id !== categoryId))
      toast.success('Category deleted successfully')
    }
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

  const activeCategories = categories.filter(c => c.is_active).length
  const totalUsage = categories.reduce((sum, c) => sum + c.usage_count, 0)

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
              <h2 className="text-3xl font-bold tracking-tight">Expense Categories</h2>
              <p className="text-muted-foreground">
                Manage expense categories and their usage statistics
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCategory(null)
                  setFormData({
                    name: '',
                    description: ''
                  })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCategory 
                      ? 'Update category information'
                      : 'Create a new expense category'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Office Supplies"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of this expense category"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="min-h-[80px]"
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
                      {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
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
                <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeCategories} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsage}</div>
                <p className="text-xs text-muted-foreground">
                  Expenses recorded
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Used</CardTitle>
                <Badge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {categories.sort((a, b) => b.usage_count - a.usage_count)[0]?.name || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {categories.sort((a, b) => b.usage_count - a.usage_count)[0]?.usage_count || 0} times
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Categories Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Categories ({categories.length})</CardTitle>
              <CardDescription>
                Manage expense categories and track their usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Usage Statistics</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories
                      .sort((a, b) => b.usage_count - a.usage_count)
                      .map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                              <Tag className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                            </div>
                            <div>
                              <p className="font-medium">{category.name}</p>
                              <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold">{category.usage_count}</span>
                            {category.usage_count > 20 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : category.usage_count > 10 ? (
                              <Badge variant="secondary">Moderate</Badge>
                            ) : (
                              <TrendingDown className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            expenses recorded
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatCurrency(category.total_amount)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            total spent
                          </p>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(category.id)}
                            className={category.is_active ? "text-green-600" : "text-red-600"}
                          >
                            {category.is_active ? "Active" : "Inactive"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {new Date(category.created_at).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(category)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(category.id)}
                              disabled={category.usage_count > 0}
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
              
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Categories that have been used in expense records cannot be deleted. 
                  You can deactivate them to prevent new usage while preserving historical data.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}