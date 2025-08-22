import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import Link from "next/link"

// Mock data - replace with real data from Supabase later
const mockSales = [
  {
    id: "1",
    store_name: "CBD Store",
    sale_date: "2025-01-22",
    tender_type: "cash",
    amount: 1500.00,
    notes: "Regular sale",
    created_at: "2025-01-22T10:30:00Z"
  },
  {
    id: "2", 
    store_name: "Fashion Store",
    sale_date: "2025-01-22",
    tender_type: "upi",
    amount: 2300.00,
    notes: "Large purchase",
    created_at: "2025-01-22T09:15:00Z"
  },
  {
    id: "3",
    store_name: "Home Store", 
    sale_date: "2025-01-22",
    tender_type: "credit_card",
    amount: 899.00,
    notes: "Card payment",
    created_at: "2025-01-22T08:45:00Z"
  },
]

const getTenderTypeBadge = (type: string) => {
  const variants = {
    cash: "default",
    upi: "secondary",
    credit_card: "outline",
    gift_voucher: "destructive"
  } as const
  
  return variants[type as keyof typeof variants] || "default"
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount)
}

export default function SalesPage() {
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
              <h2 className="text-3xl font-bold tracking-tight">Sales</h2>
              <p className="text-muted-foreground">
                Manage and track all sales transactions
              </p>
            </div>
            <Link href="/sales/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Sale
              </Button>
            </Link>
          </div>

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>
                A list of all sales transactions from all stores
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
                      <TableHead className="min-w-[120px]">Payment</TableHead>
                      <TableHead className="min-w-[150px]">Notes</TableHead>
                      <TableHead className="min-w-[100px]">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">
                          {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell>{sale.store_name}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(sale.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTenderTypeBadge(sale.tender_type)}>
                            {sale.tender_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {sale.notes || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(sale.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {mockSales.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No sales recorded yet.</p>
                  <Link href="/sales/new">
                    <Button className="mt-2">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Sale
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mobile Card View - Hidden on desktop */}
          <div className="block lg:hidden mt-6">
            <div className="space-y-4">
              {mockSales.map((sale) => (
                <Card key={sale.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{sale.store_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sale.sale_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <Badge variant={getTenderTypeBadge(sale.tender_type)}>
                        {sale.tender_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold">
                        {formatCurrency(sale.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {sale.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {sale.notes}
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