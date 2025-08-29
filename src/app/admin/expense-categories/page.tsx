"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"

interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    display_order: 0
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('display_order')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error: any) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load expense categories')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('handleSubmit called!')
    e.preventDefault()

    console.log('Current formData:', formData)
    
    if (!formData.name.trim()) {
      console.log('Validation failed: name is empty')
      toast.error('Category name is required')
      return
    }

    console.log('Validation passed, setting loading to true')
    setLoading(true)

    try {
      console.log('Form submission started with data:', formData)
      
      if (editingCategory) {
        // Update existing category
        console.log('Updating category:', editingCategory.id)
        const { data, error } = await supabase
          .from('expense_categories')
          .update({
            name: formData.name,
            description: formData.description || null,
            is_active: formData.is_active,
            display_order: formData.display_order
          })
          .eq('id', editingCategory.id)
          .select()

        console.log('Update result:', { data, error })
        if (error) throw error
        toast.success('Category updated successfully')
      } else {
        // Create new category
        const insertData = {
          name: formData.name,
          description: formData.description || null,
          is_active: formData.is_active,
          display_order: formData.display_order || categories.length + 1
        }
        console.log('Inserting new category:', insertData)
        
        const { data, error } = await supabase
          .from('expense_categories')
          .insert([insertData])
          .select()

        console.log('Insert result:', { data, error })
        if (error) {
          console.error('Supabase insert error:', error)
          throw new Error(error.message)
        }
        console.log('Category created successfully:', data)
        toast.success('Category created successfully')
      }

      // Reset form and reload
      setFormData({ name: '', description: '', is_active: true, display_order: 0 })
      setEditingCategory(null)
      setDialogOpen(false)
      await loadCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(error.message || 'Failed to save category')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
      display_order: category.display_order
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('Category deleted successfully')
      await loadCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      toast.success(`Category ${!currentStatus ? 'activated' : 'deactivated'}`)
      await loadCategories()
    } catch (error: any) {
      console.error('Error toggling category status:', error)
      toast.error('Failed to update category status')
    }
  }

  const updateOrder = async (id: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id)
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === categories.length - 1)) return

    const newOrder = [...categories]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    // Swap display orders
    const tempOrder = newOrder[index].display_order
    newOrder[index].display_order = newOrder[targetIndex].display_order
    newOrder[targetIndex].display_order = tempOrder

    try {
      // Update both categories
      await Promise.all([
        supabase.from('expense_categories').update({ display_order: newOrder[index].display_order }).eq('id', newOrder[index].id),
        supabase.from('expense_categories').update({ display_order: newOrder[targetIndex].display_order }).eq('id', newOrder[targetIndex].id)
      ])

      await loadCategories()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
    }
  }

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
              <h2 className="text-3xl font-bold tracking-tight">Expense Categories</h2>
              <p className="text-muted-foreground">
                Manage expense categories for your stores
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCategory(null)
                  setFormData({ name: '', description: '', is_active: true, display_order: 0 })
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Expense Category</DialogTitle>
                  <DialogDescription>
                    {editingCategory ? 'Update the expense category details' : 'Create a new expense category'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Fuel, Transportation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="button" 
                      disabled={loading}
                      onClick={(e) => {
                        console.log('Submit button clicked!')
                        e.preventDefault()
                        handleSubmit(e as any)
                      }}
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {categories.length} expense {categories.length === 1 ? 'category' : 'categories'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                      </TableRow>
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No categories found</TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category, index) => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateOrder(category.id, 'up')}
                                disabled={index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => updateOrder(category.id, 'down')}
                                disabled={index === categories.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {category.description || '-'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={category.is_active}
                              onCheckedChange={() => toggleActive(category.id, category.is_active)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(category)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
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