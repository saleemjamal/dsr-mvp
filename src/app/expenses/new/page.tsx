"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { SmartCameraCapture } from "@/components/ui/smart-camera-capture"
import { CapturedPhoto } from "@/components/ui/mobile-camera-input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Camera, Receipt, Plus, Trash2, Image } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { getActiveStores, type Store } from "@/lib/sales-service"
import { getActiveExpenseCategories, createBatchExpenses, type ExpenseCategory, type Expense } from "@/lib/expense-service"
import { uploadImage, generateImagePath } from "@/lib/storage-service"
import { useStore } from "@/contexts/store-context"

interface ExpenseRow {
  id: string
  category: string
  amount: string
  description: string
  imageData: CapturedPhoto | null
}

export default function NewExpensePage() {
  const router = useRouter()
  const { accessibleStores, currentStore } = useStore()
  const [loading, setLoading] = useState(false)
  const [stores, setStores] = useState<Store[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraRowId, setCameraRowId] = useState<string>("")
  const [storeId, setStoreId] = useState("")
  const [expenses, setExpenses] = useState<ExpenseRow[]>([
    { id: '1', category: '', amount: '', description: '', imageData: null }
  ])

  // Load stores and categories on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storeList, categoryList] = await Promise.all([
          getActiveStores(),
          getActiveExpenseCategories()
        ])
        setStores(storeList)
        setCategories(categoryList)

        // Set default store for single-store users
        if (accessibleStores && accessibleStores.length === 1) {
          setStoreId(accessibleStores[0].id)
        } else if (currentStore?.id) {
          setStoreId(currentStore.id)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load data')
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [accessibleStores, currentStore])

  const addExpenseRow = () => {
    const newRow: ExpenseRow = {
      id: Date.now().toString(),
      category: '',
      amount: '',
      description: '',
      imageData: null
    }
    setExpenses([...expenses, newRow])
  }

  const removeExpenseRow = (id: string) => {
    if (expenses.length === 1) {
      toast.error("At least one expense is required")
      return
    }
    setExpenses(expenses.filter(expense => expense.id !== id))
  }

  const updateExpenseRow = (id: string, field: keyof ExpenseRow, value: string) => {
    setExpenses(expenses.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ))
  }

  const openCameraForRow = (rowId: string) => {
    setCameraRowId(rowId)
    setShowCamera(true)
  }

  const handlePhotoCapture = (photo: CapturedPhoto) => {
    setExpenses(expenses.map(expense => 
      expense.id === cameraRowId ? { ...expense, imageData: photo } : expense
    ))
    setShowCamera(false)
    setCameraRowId("")
    toast.success("Expense voucher image captured successfully!")
  }

  const removeImageFromRow = (rowId: string) => {
    setExpenses(expenses.map(expense => 
      expense.id === rowId ? { ...expense, imageData: null } : expense
    ))
  }

  const validateExpenses = () => {
    if (!storeId) {
      toast.error("Please select a store")
      return false
    }

    const validExpenses = expenses.filter(expense => 
      expense.category && expense.amount && parseFloat(expense.amount) > 0
    )

    if (validExpenses.length === 0) {
      toast.error("Please add at least one valid expense (category and amount required)")
      return false
    }

    // Check for invalid amounts
    const invalidAmounts = expenses.filter(expense => 
      expense.amount && (isNaN(parseFloat(expense.amount)) || parseFloat(expense.amount) <= 0)
    )

    if (invalidAmounts.length > 0) {
      toast.error("All amounts must be greater than 0")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateExpenses()) return

    setLoading(true)

    try {
      // Filter out empty rows
      const validExpenses = expenses.filter(expense => 
        expense.category && expense.amount && parseFloat(expense.amount) > 0
      )

      console.log('Processing', validExpenses.length, 'expenses...')

      // Upload all images in parallel
      const expensePromises = validExpenses.map(async (expense): Promise<Omit<Expense, 'id' | 'created_at' | 'updated_at'>> => {
        let imageUrl: string | null = null

        if (expense.imageData?.dataUrl) {
          console.log(`Uploading image for ${expense.category} expense...`)
          const imagePath = generateImagePath(storeId, 'expense')
          imageUrl = await uploadImage('expenses', imagePath, expense.imageData.dataUrl || '')
          
          if (!imageUrl) {
            throw new Error(`Failed to upload image for ${expense.category} expense`)
          }
          console.log(`Image uploaded for ${expense.category}:`, imageUrl)
        }

        return {
          store_id: storeId,
          expense_date: new Date().toISOString().split('T')[0],
          category: expense.category,
          amount: parseFloat(expense.amount),
          description: expense.description || '',
          voucher_image_url: imageUrl || undefined
        }
      })

      // Wait for all image uploads to complete
      const expenseData = await Promise.all(expensePromises)
      console.log('All images uploaded, creating expenses in database...')

      // Create all expenses in batch
      await createBatchExpenses(expenseData)

      toast.success(`${expenseData.length} expenses recorded successfully!`)
      
      // Reset form
      setExpenses([{ id: '1', category: '', amount: '', description: '', imageData: null }])
      
      // Redirect to expenses page
      router.push('/expenses')
    } catch (error) {
      console.error('Error creating expenses:', error)
      toast.error(`Failed to record expenses: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getUsableStores = () => {
    return accessibleStores && accessibleStores.length > 0 ? accessibleStores : stores
  }

  if (showCamera) {
    return (
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-64 border-r">
          <Sidebar />
        </aside>
        
        <div className="flex-1">
          <Header />
          
          <main className="p-6">
            <div className="max-w-4xl mx-auto">
              <SmartCameraCapture 
                onPhotoCapture={handlePhotoCapture}
                onCancel={() => {
                  setShowCamera(false)
                  setCameraRowId("")
                }}
              />
            </div>
          </main>
        </div>
      </div>
    )
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
            <Link href="/expenses">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Daily Expense Entry</h2>
              <p className="text-muted-foreground">
                Enter all expenses for the day with optional voucher images
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="max-w-6xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Store Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Store Selection</CardTitle>
                  <CardDescription>Select the store for these expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-md">
                    <Label htmlFor="store">Store *</Label>
                    <Select 
                      value={storeId} 
                      onValueChange={setStoreId}
                    >
                      <SelectTrigger id="store" className="h-12" disabled={loadingData}>
                        <SelectValue placeholder={loadingData ? "Loading..." : "Select store"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getUsableStores().map((store) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.store_name} ({store.store_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Expense Details</CardTitle>
                      <CardDescription>
                        Add multiple expense categories with amounts and optional voucher images
                      </CardDescription>
                    </div>
                    <Button 
                      type="button" 
                      onClick={addExpenseRow}
                      variant="outline"
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Category *</TableHead>
                          <TableHead className="min-w-[120px]">Amount *</TableHead>
                          <TableHead className="min-w-[200px]">Description</TableHead>
                          <TableHead className="min-w-[120px]">Voucher Image</TableHead>
                          <TableHead className="w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              <Select 
                                value={expense.category} 
                                onValueChange={(value) => updateExpenseRow(expense.id, 'category', value)}
                              >
                                <SelectTrigger className="h-10" disabled={loadingData}>
                                  <SelectValue placeholder={loadingData ? "Loading..." : "Select category"} />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.name}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="h-10"
                                value={expense.amount}
                                onChange={(e) => updateExpenseRow(expense.id, 'amount', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Optional description..."
                                className="h-10"
                                value={expense.description}
                                onChange={(e) => updateExpenseRow(expense.id, 'description', e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {expense.imageData ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative">
                                      <img 
                                        src={expense.imageData.dataUrl} 
                                        alt="Expense voucher" 
                                        className="w-12 h-12 object-cover rounded border cursor-pointer"
                                        onClick={() => openCameraForRow(expense.id)}
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                                        onClick={() => removeImageFromRow(expense.id)}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openCameraForRow(expense.id)}
                                  >
                                    <Camera className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExpenseRow(expense.id)}
                                disabled={expenses.length === 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Expenses: {expenses.filter(e => e.category && e.amount).length} | 
                        Total Amount: ₹{expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0).toFixed(2)} |
                        With Images: {expenses.filter(e => e.imageData).length}
                      </span>
                      <span className="text-muted-foreground">
                        Date: {new Date().toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 space-y-2 space-y-reverse sm:space-y-0">
                <Link href="/expenses">
                  <Button type="button" variant="outline" className="w-full sm:w-auto h-12">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Recording Expenses...
                    </>
                  ) : (
                    <>
                      <Receipt className="mr-2 h-4 w-4" />
                      Record All Expenses
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}