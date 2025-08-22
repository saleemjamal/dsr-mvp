import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import Link from "next/link"

// Mock data - replace with real data from Supabase later
const mockExpenses = [
  {
    id: "1",
    store_name: "CBD Store",
    expense_date: "2025-01-22",
    category: "Staff Welfare",
    amount: 500.00,
    description: "Coffee and snacks for staff",
    created_at: "2025-01-22T10:30:00Z"
  },
  {
    id: "2", 
    store_name: "Fashion Store",
    expense_date: "2025-01-22",
    category: "Logistics",
    amount: 1200.00,
    description: "Delivery charges for inventory",
    created_at: "2025-01-22T09:15:00Z"
  },
  {
    id: "3",
    store_name: "Home Store", 
    expense_date: "2025-01-21",
    category: "Utilities",
    amount: 850.00,
    description: "Electricity bill payment",
    created_at: "2025-01-21T16:45:00Z"
  },
]

const getCategoryColor = (category: string) => {
  const colors = {
    "Staff Welfare": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    "Logistics": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    "Utilities": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    "Miscellaneous": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  } as const
  
  return colors[category as keyof typeof colors] || colors["Miscellaneous"]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export default function ExpensesPage() {
  const totalExpenses = mockExpenses.reduce((sum, expense) => sum + expense.amount, 0)

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
              <p className="text-muted-foreground">
                Track and manage business expenses across all stores
              </p>
            </div>
            <Link href="/expenses/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </Link>
          </div>

          {/* Summary Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Expense Summary</CardTitle>
              <CardDescription>Overview of recent expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                  <p className="text-sm text-muted-foreground">Total This Month</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{mockExpenses.length}</p>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatCurrency(totalExpenses / mockExpenses.length)}</p>
                  <p className="text-sm text-muted-foreground">Average Amount</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">Active Stores</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                A list of all expense transactions from all stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Date</TableHead>
                      <TableHead className="min-w-[120px]">Store</TableHead>
                      <TableHead className="min-w-[100px]">Amount</TableHead>
                      <TableHead className="min-w-[120px]">Category</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="min-w-[100px]">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">
                          {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>{expense.store_name}</TableCell>
                        <TableCell className="font-medium text-red-600">
                          -{formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(expense.category)}>
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {expense.description || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(expense.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {mockExpenses.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No expenses recorded yet.</p>
                  <Link href="/expenses/new">
                    <Button className="mt-2">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Expense
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="block lg:hidden mt-6">
            <div className="space-y-4">
              {mockExpenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{expense.store_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-red-600">
                        -{formatCurrency(expense.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(expense.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground">
                        {expense.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}