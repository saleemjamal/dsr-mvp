import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Download, Calendar, Construction } from "lucide-react"

// Mock report data
const mockReports = [
  {
    id: "1",
    title: "Daily Sales Summary",
    description: "Comprehensive daily sales report across all stores",
    type: "Sales",
    status: "Ready",
    lastGenerated: "2025-01-22T10:30:00Z"
  },
  {
    id: "2",
    title: "Expense Analysis",
    description: "Monthly expense breakdown by category and store",
    type: "Expenses",
    status: "Ready",
    lastGenerated: "2025-01-22T09:15:00Z"
  },
  {
    id: "3",
    title: "Cash Reconciliation",
    description: "Daily cash variance and reconciliation report",
    type: "Finance",
    status: "Processing",
    lastGenerated: "2025-01-22T08:45:00Z"
  }
]

export default function ReportsPage() {
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
              <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
              <p className="text-muted-foreground">
                Generate and download business reports and analytics
              </p>
            </div>
            <Button disabled>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Report
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Reports</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  Different report types
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">
                  Reports generated
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Used</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Daily Sales</div>
                <p className="text-xs text-muted-foreground">
                  Most popular report
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Available Reports */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
              <CardDescription>
                Quick access to commonly used reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="secondary">{report.type}</Badge>
                          <Badge variant={report.status === 'Ready' ? 'default' : 'outline'}>
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button variant="outline" size="sm" disabled>
                        <Download className="mr-2 h-4 w-4" />
                        Generate
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last: {new Date(report.lastGenerated).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon Notice */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Construction className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">Advanced Reports - Coming Soon</CardTitle>
              <CardDescription>
                Full reporting functionality is being developed and will include:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Report Features:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Custom date ranges</li>
                    <li>• Multiple export formats</li>
                    <li>• Scheduled reports</li>
                    <li>• Email delivery</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Report Types:</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Sales analytics</li>
                    <li>• Expense tracking</li>
                    <li>• Cash reconciliation</li>
                    <li>• Voucher liability</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}