import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Users, UserPlus, Shield, Construction } from "lucide-react"
import Link from "next/link"

export default function UserManagementPage() {
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
              <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
              <p className="text-muted-foreground">
                Manage user accounts, roles, and permissions
              </p>
            </div>
            <Button disabled>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          {/* Coming Soon Card */}
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Construction className="h-10 w-10 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">User Management - Coming Soon</CardTitle>
              <CardDescription>
                This feature will be available once authentication is implemented in the next phase.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-4 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="font-medium">User Accounts</p>
                    <p className="text-muted-foreground">Create and manage user profiles</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">Role-based Access</p>
                    <p className="text-muted-foreground">Assign roles and permissions</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="font-medium">User Registration</p>
                    <p className="text-muted-foreground">Whitelist and approval system</p>
                  </div>
                </div>
                
                <div className="space-y-4 text-left bg-muted p-6 rounded-lg">
                  <h4 className="font-medium">Planned User Management Features:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <ul className="space-y-2">
                      <li>• User registration and approval</li>
                      <li>• Email whitelist system</li>
                      <li>• Role-based permissions (Admin, Manager, Cashier)</li>
                      <li>• Store-specific access control</li>
                    </ul>
                    <ul className="space-y-2">
                      <li>• Google SSO integration</li>
                      <li>• Session management</li>
                      <li>• Activity logging</li>
                      <li>• Password reset functionality</li>
                    </ul>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Current Status</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    The MVP currently operates without authentication to allow rapid development and testing. 
                    User management will be the first major feature added in the next development phase.
                  </p>
                </div>
                
                <div className="flex justify-center space-x-4">
                  <Badge variant="secondary">Phase 2 Feature</Badge>
                  <Badge variant="outline">High Priority</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}