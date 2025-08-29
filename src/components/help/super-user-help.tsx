"use client"

import { useState, useEffect } from "react"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  ChevronRight, 
  Clock, 
  DollarSign, 
  ShoppingCart,
  FileText,
  Gift,
  RotateCcw,
  Users,
  Calculator,
  Package,
  AlertTriangle,
  CheckCircle,
  Home,
  Shield,
  Settings,
  UserCheck,
  Building,
  CheckSquare,
  BarChart3,
  Key
} from "lucide-react"

interface SuperUserHelpProps {
  searchQuery: string
  activeSection?: string
}

export function SuperUserHelp({ searchQuery, activeSection }: SuperUserHelpProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["daily-ops"])
  
  // Update expanded sections when activeSection changes
  useEffect(() => {
    if (activeSection && activeSection !== 'overview') {
      // Map activeSection to the corresponding section id
      const sectionMap: Record<string, string> = {
        'daily-ops': 'daily-ops',
        'transactions': 'sales',
        'cash-mgmt': 'cash-mgmt',
        'guidelines': 'admin-tasks'
      }
      
      const sectionId = sectionMap[activeSection]
      if (sectionId && !expandedSections.includes(sectionId)) {
        setExpandedSections([...expandedSections, sectionId])
        
        // Scroll to the section after a short delay to allow accordion to expand
        setTimeout(() => {
          const element = document.getElementById(sectionId)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
      }
    }
  }, [activeSection])

  const sections = [
    {
      id: "daily-ops",
      title: "Daily Operations & Oversight",
      icon: Clock,
      content: [
        {
          title: "System Monitoring",
          path: "Dashboard",
          steps: [
            "• Review all store dashboards",
            "• Check cash variance alerts across stores",
            "• Monitor pending approvals queue",
            "• Review system notifications",
            "• Check for any security alerts",
            "• Verify all stores have completed daily counts"
          ]
        },
        {
          title: "Approval Workflows",
          path: "Dashboard → Approvals",
          steps: [
            "Cash Transfer Approvals:",
            "• Review pending cash transfer requests",
            "• Verify request justification",
            "• Check current balance availability",
            "• Approve/Reject with notes",
            "• Monitor high-priority requests",
            "",
            "Cash Adjustment Approvals:",
            "• Review adjustment requests",
            "• Verify adjustment types:",
            "  - Initial Setup: First-time petty cash",
            "  - Correction: Fix discrepancies",
            "  - Injection: Emergency funds",
            "  - Loss: Theft/shortage reports",
            "• Approve with amount modifications if needed",
            "• Track adjustment audit trail"
          ]
        }
      ]
    },
    {
      id: "sales",
      title: "Store Operations Management",
      icon: ShoppingCart,
      content: [
        {
          title: "Multi-Store Operations",
          path: "Dashboard → Store Selector",
          steps: [
            "• Switch between stores using store selector",
            "• View store-specific dashboards",
            "• Monitor store performance metrics",
            "• Compare store cash positions",
            "• Track store-wise sales trends"
          ]
        },
        {
          title: "Store Manager Support",
          path: "",
          steps: [
            "• All Store Manager functions available",
            "• Override capabilities for corrections",
            "• Emergency cash injection approvals",
            "• Direct database corrections if needed",
            "• Support store managers with issues"
          ]
        }
      ]
    },
    {
      id: "user-mgmt",
      title: "User Management",
      icon: Users,
      content: [
        {
          title: "User Administration",
          path: "Dashboard → Admin → Users",
          steps: [
            "Creating Users:",
            "• Navigate to Admin → Users",
            "• Click 'Add User'",
            "• Enter email address",
            "• Assign role:",
            "  - Super User: Full system access",
            "  - Accounts Incharge: Financial oversight",
            "  - Store Manager: Store operations",
            "  - Cashier: Transaction processing",
            "• Assign store access (one or multiple)",
            "• Set as active/inactive",
            "• Save user"
          ]
        },
        {
          title: "Email Whitelist Management",
          path: "Dashboard → Admin → Email Whitelist",
          steps: [
            "• Pre-authorize user emails",
            "• Assign roles at whitelist time",
            "• Assign default stores",
            "• Bulk domain whitelisting",
            "• Auto-role assignment on first login"
          ]
        },
        {
          title: "Access Control",
          path: "",
          steps: [
            "• Grant/revoke store access",
            "• Modify user roles",
            "• Deactivate users (preserves history)",
            "• Monitor user activity",
            "• Reset user sessions if needed"
          ]
        }
      ]
    },
    {
      id: "store-mgmt",
      title: "Store Management",
      icon: Building,
      content: [
        {
          title: "Store Setup",
          path: "Dashboard → Admin → Stores",
          steps: [
            "Adding New Store:",
            "• Click 'Add Store'",
            "• Enter store code (unique)",
            "• Enter store name",
            "• Add address and contact details",
            "• Set as active",
            "• Save store",
            "",
            "Initial Cash Setup:",
            "• Go to Cash Management → Adjustments",
            "• Select 'Initial Setup' type",
            "• Enter opening petty cash amount",
            "• Approve immediately"
          ]
        },
        {
          title: "Store Configuration",
          path: "",
          steps: [
            "• Update store information",
            "• Assign store managers",
            "• Set store-specific limits",
            "• Configure operating hours",
            "• Deactivate stores (preserves data)"
          ]
        }
      ]
    },
    {
      id: "cash-mgmt",
      title: "Cash Management Administration",
      icon: DollarSign,
      content: [
        {
          title: "Cash Oversight",
          path: "Dashboard → Cash Management",
          steps: [
            "• Monitor all store cash positions",
            "• Review daily variance reports",
            "• Track cash movement patterns",
            "• Approve emergency transfers",
            "• Set cash limit policies"
          ]
        },
        {
          title: "Adjustment Management",
          path: "Dashboard → Cash Management → Audit Trail",
          steps: [
            "• View complete adjustment history",
            "• Track adjustment patterns",
            "• Identify frequent adjustment stores",
            "• Review rejection reasons",
            "• Export audit reports"
          ]
        },
        {
          title: "Reconciliation Oversight",
          path: "Dashboard → Reconciliation",
          steps: [
            "• Monitor AIC reconciliation progress",
            "• Review reconciliation exceptions",
            "• Approve reconciliation overrides",
            "• Track unreconciled transactions",
            "• Generate reconciliation reports"
          ]
        }
      ]
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      icon: BarChart3,
      content: [
        {
          title: "Financial Reports",
          path: "Dashboard → Reports → Financial",
          steps: [
            "• Daily Sales Summary (all stores)",
            "• Expense Reports (category-wise)",
            "• Cash Flow Statements",
            "• Profit & Loss Analysis",
            "• Store-wise comparisons"
          ]
        },
        {
          title: "Operational Reports",
          path: "Dashboard → Reports → Operational",
          steps: [
            "• Store Performance Metrics",
            "• Transaction Logs",
            "• Cash Variance Reports",
            "• User Activity Logs",
            "• System Usage Statistics"
          ]
        },
        {
          title: "Compliance & Export",
          path: "Dashboard → Reports → Compliance",
          steps: [
            "• Tally Export (XML/Excel)",
            "• Tax Summary Reports",
            "• Audit Trail Reports",
            "• Regulatory Compliance",
            "• Custom Report Generation"
          ]
        }
      ]
    },
    {
      id: "system-config",
      title: "System Configuration",
      icon: Settings,
      content: [
        {
          title: "Category Management",
          path: "Dashboard → Admin → Expense Categories",
          steps: [
            "• Add/Edit expense categories",
            "• Set category display order",
            "• Activate/Deactivate categories",
            "• Map to accounting codes"
          ]
        },
        {
          title: "Tender Type Management",
          path: "Dashboard → Admin → Tender Types",
          steps: [
            "• Configure payment methods",
            "• Add new tender types",
            "• Set tender type rules",
            "• Configure validation requirements"
          ]
        },
        {
          title: "System Settings",
          path: "",
          steps: [
            "• Configure business rules",
            "• Set approval limits",
            "• Define variance thresholds",
            "• Configure notification rules",
            "• Set system-wide policies"
          ]
        }
      ]
    },
    {
      id: "admin-tasks",
      title: "Administrative Guidelines",
      icon: Shield,
      content: [
        {
          title: "Security Best Practices",
          path: "",
          steps: [
            "• Regular password policy enforcement",
            "• Monitor failed login attempts",
            "• Review user access quarterly",
            "• Audit trail regular reviews",
            "• Implement least privilege principle",
            "• Regular security training for staff"
          ]
        },
        {
          title: "Data Management",
          path: "",
          steps: [
            "• Regular database backups",
            "• Transaction data archival",
            "• Clean test data before production",
            "• Monitor database performance",
            "• Regular data integrity checks"
          ]
        },
        {
          title: "Emergency Procedures",
          path: "",
          steps: [
            "• System recovery procedures",
            "• Emergency cash injection process",
            "• User lockout resolution",
            "• Data recovery protocols",
            "• Incident response plan",
            "• Escalation matrix"
          ]
        },
        {
          title: "Compliance Requirements",
          path: "",
          steps: [
            "• Maintain audit trail integrity",
            "• Ensure regulatory compliance",
            "• Document all overrides",
            "• Preserve transaction history",
            "• Regular compliance audits",
            "• Tax reporting accuracy"
          ]
        }
      ]
    }
  ]

  // Filter sections based on search query
  const filteredSections = searchQuery
    ? sections.filter(section => 
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.content.some(item => 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.steps.some(step => step.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      )
    : sections

  return (
    <div className="space-y-6">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          As a Super User, you have complete system control including user management, approvals, system configuration, and multi-store oversight.
        </AlertDescription>
      </Alert>

      <Accordion 
        type="multiple" 
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-4"
      >
        {filteredSections.map((section) => {
          const Icon = section.icon
          return (
            <AccordionItem key={section.id} value={section.id} id={section.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-lg">{section.title}</span>
                  {section.id === 'admin-tasks' && (
                    <Badge variant="destructive" className="ml-2">Important</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6">
                  {section.content.map((item, index) => (
                    <div key={index} className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-base mb-1">{item.title}</h4>
                        {item.path && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                            <Home className="h-3 w-3" />
                            {item.path.split(' → ').map((part, i) => (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight className="h-3 w-3" />}
                                <span>{part}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="pl-4 space-y-1">
                        {item.steps.map((step, stepIndex) => (
                          <div key={stepIndex} className="text-sm">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {filteredSections.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  )
}