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
  FileCheck,
  FileText,
  BarChart3,
  CheckSquare,
  AlertTriangle,
  Home,
  TrendingUp,
  Download,
  Eye,
  Calculator,
  Building
} from "lucide-react"

interface AccountsInchargeHelpProps {
  searchQuery: string
  activeSection?: string
}

export function AccountsInchargeHelp({ searchQuery, activeSection }: AccountsInchargeHelpProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["reconciliation"])
  
  // Update expanded sections when activeSection changes
  useEffect(() => {
    if (activeSection && activeSection !== 'overview') {
      // Map activeSection to the corresponding section id
      const sectionMap: Record<string, string> = {
        'daily-ops': 'reconciliation',
        'transactions': 'transaction-mgmt',
        'cash-mgmt': 'financial-oversight',
        'guidelines': 'compliance'
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
      id: "reconciliation",
      title: "Daily Reconciliation Workflow",
      icon: CheckSquare,
      content: [
        {
          title: "Morning Reconciliation Process",
          path: "Dashboard → Reconciliation",
          steps: [
            "Daily Schedule (11:30 AM - 12:30 PM):",
            "• Access Reconciliation module from sidebar",
            "• Filter by 'Pending' status to see unreconciled transactions",
            "• Review transactions by type:",
            "  - Sales: Match with POS/bank deposits",
            "  - Expenses: Verify with receipts/vouchers",
            "  - Returns: Confirm refund processing",
            "  - Hand Bills: Cross-check physical bills",
            "  - Gift Vouchers: Validate issuance/redemption",
            "  - Sales Orders: Track advance payments",
            "",
            "Quick Reconciliation:",
            "• Use 'Reconcile' button for verified transactions",
            "• System auto-timestamps and records your user ID",
            "• Transaction status changes: pending → reconciled",
            "",
            "Detailed Reconciliation:",
            "• Click transaction for detailed view",
            "• Select source: Bank/ERP/Cash/Voucher",
            "• Add external reference number",
            "• Include reconciliation notes",
            "• Submit to complete reconciliation"
          ]
        },
        {
          title: "Batch Reconciliation",
          path: "Dashboard → Reconciliation",
          steps: [
            "• Select multiple transactions using checkboxes",
            "• Click 'Reconcile Selected' button",
            "• Add common reference if applicable",
            "• Confirm batch reconciliation",
            "• All selected items marked reconciled",
            "",
            "Best for:",
            "• Multiple sales from same batch",
            "• Group of expenses from same vendor",
            "• Daily UPI/card settlements"
          ]
        },
        {
          title: "Reconciliation Rules",
          path: "",
          steps: [
            "• Only pending transactions can be reconciled",
            "• Reconciled transactions cannot be edited",
            "• Store users can only edit pending status",
            "• Maintain audit trail with notes",
            "• Cross-verify amounts before reconciling",
            "• Report discrepancies immediately"
          ]
        }
      ]
    },
    {
      id: "transaction-mgmt",
      title: "Transaction Management & Oversight",
      icon: FileText,
      content: [
        {
          title: "Sales Orders (SO) Management",
          path: "Dashboard → Sales Orders",
          steps: [
            "Daily Monitoring:",
            "• Review pending deliveries",
            "• Check advance payment collection",
            "• Monitor overdue orders",
            "• Track balance payments",
            "",
            "Reconciliation Process:",
            "• Verify advance amounts against receipts",
            "• Match final payments on delivery",
            "• Ensure status updates are accurate",
            "• Convert completed orders to sales"
          ]
        },
        {
          title: "Hand Bills (HB) Processing",
          path: "Dashboard → Hand Bills",
          steps: [
            "Verification Steps:",
            "• Review uploaded bill images",
            "• Match amounts with physical bills",
            "• Check tender type accuracy",
            "• Verify customer details",
            "",
            "Conversion Process:",
            "• Convert verified hand bills to system sales",
            "• Maintain linkage for audit trail",
            "• Update reconciliation status"
          ]
        },
        {
          title: "Returns (RRN) Oversight",
          path: "Dashboard → Returns",
          steps: [
            "Return Verification:",
            "• Validate original transaction reference",
            "• Confirm refund method and amount",
            "• Check manager approval for high values",
            "• Verify petty cash impact for cash refunds",
            "",
            "Reconciliation:",
            "• Match with bank refunds",
            "• Track store credit issuance",
            "• Monitor return patterns for fraud"
          ]
        },
        {
          title: "Gift Voucher (GV) Tracking",
          path: "Dashboard → Vouchers",
          steps: [
            "Issuance Monitoring:",
            "• Track voucher sales by store",
            "• Verify payment collection",
            "• Monitor outstanding balances",
            "",
            "Redemption Oversight:",
            "• Track redemption patterns",
            "• Verify partial redemptions",
            "• Monitor expired vouchers",
            "• Reconcile with sales transactions"
          ]
        }
      ]
    },
    {
      id: "financial-oversight",
      title: "Financial Management",
      icon: DollarSign,
      content: [
        {
          title: "Cash Position Monitoring",
          path: "Dashboard → Cash Management",
          steps: [
            "Daily Cash Review:",
            "• Monitor all store cash positions",
            "• Track variance alerts (>₹100 sales, >₹50 petty)",
            "• Review daily deposits",
            "• Verify bank reconciliation",
            "",
            "Variance Analysis:",
            "• Investigate discrepancies",
            "• Document variance reasons",
            "• Approve corrective adjustments",
            "• Track patterns across stores"
          ]
        },
        {
          title: "Expense Management",
          path: "Dashboard → Expenses",
          steps: [
            "• Review daily expense submissions",
            "• Verify receipt images",
            "• Check category allocation",
            "• Monitor expense patterns",
            "• Flag unusual expenses",
            "• Approve reimbursements"
          ]
        },
        {
          title: "Multi-Store Oversight",
          path: "Dashboard → Store Selector",
          steps: [
            "• Switch between stores for review",
            "• Compare store performance",
            "• Monitor cash flow across locations",
            "• Track inter-store variances",
            "• Generate consolidated reports"
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
          title: "Daily Reports Generation",
          path: "Dashboard → Reports",
          steps: [
            "Essential Daily Reports:",
            "• Daily Sales Summary",
            "  - Payment method breakdown",
            "  - Store-wise performance",
            "  - Category analysis",
            "• Cash Flow Statement",
            "  - Opening/closing balances",
            "  - Deposits and withdrawals",
            "• Expense Report",
            "  - Category-wise breakdown",
            "  - Store comparisons",
            "• Variance Report",
            "  - Cash count discrepancies",
            "  - Investigation status"
          ]
        },
        {
          title: "Tally Export Process",
          path: "Dashboard → Reports → Tally Export",
          steps: [
            "Daily Export (After Reconciliation):",
            "• Select date range",
            "• Choose export format:",
            "  - XML (Tally Prime compatible)",
            "  - Excel (detailed breakdown)",
            "  - CSV (raw data)",
            "• Map to accounting codes",
            "• Include GST calculations",
            "• Generate voucher entries",
            "• Download and import to Tally"
          ]
        },
        {
          title: "Analytics & Insights",
          path: "Dashboard → Reports → Analytics",
          steps: [
            "• Sales trend analysis",
            "• Payment method preferences",
            "• Peak hour identification",
            "• Store performance ranking",
            "• Expense optimization opportunities",
            "• Cash flow forecasting"
          ]
        }
      ]
    },
    {
      id: "compliance",
      title: "Compliance & Audit",
      icon: AlertTriangle,
      content: [
        {
          title: "Daily Compliance Checklist",
          path: "",
          steps: [
            "Morning (11:30 AM):",
            "□ All stores completed cash count",
            "□ Previous day transactions reconciled",
            "□ Bank deposits verified",
            "□ Variance reports reviewed",
            "",
            "Afternoon (2:00 PM):",
            "□ Expense vouchers verified",
            "□ Returns processed correctly",
            "□ Gift voucher balances checked",
            "",
            "Evening (5:00 PM):",
            "□ Tally export completed",
            "□ Reports generated and saved",
            "□ Discrepancies documented",
            "□ Next day prep completed"
          ]
        },
        {
          title: "Audit Trail Management",
          path: "Dashboard → Reports → Audit Trail",
          steps: [
            "• Maintain transaction history",
            "• Document all adjustments",
            "• Preserve reconciliation notes",
            "• Track user activities",
            "• Generate audit reports",
            "• Archive monthly data"
          ]
        },
        {
          title: "Tax Compliance",
          path: "",
          steps: [
            "• Ensure GST accuracy in exports",
            "• Maintain invoice records",
            "• Track tax-exempt transactions",
            "• Generate tax summary reports",
            "• Prepare for tax audits",
            "• Update tax rates when changed"
          ]
        },
        {
          title: "Best Practices",
          path: "",
          steps: [
            "• Complete reconciliation daily by 12:30 PM",
            "• Never skip variance investigation",
            "• Document all exceptions",
            "• Maintain backup of exports",
            "• Review patterns weekly",
            "• Escalate fraud indicators immediately",
            "• Coordinate with store managers on discrepancies",
            "• Keep external auditors informed"
          ]
        }
      ]
    },
    {
      id: "month-end",
      title: "Month-End Procedures",
      icon: Calculator,
      content: [
        {
          title: "Month-End Closing",
          path: "",
          steps: [
            "Last Day of Month:",
            "• Ensure all transactions entered",
            "• Complete final reconciliation",
            "• Process all pending adjustments",
            "• Generate month-end reports",
            "",
            "First Day of New Month:",
            "• Verify opening balances",
            "• Archive previous month data",
            "• Generate monthly summary",
            "• Prepare management reports",
            "• Review and update budgets"
          ]
        },
        {
          title: "Monthly Reports Package",
          path: "Dashboard → Reports → Monthly",
          steps: [
            "• Profit & Loss Statement",
            "• Balance Sheet reconciliation",
            "• Store-wise performance analysis",
            "• Expense trend analysis",
            "• Cash flow summary",
            "• Variance analysis report",
            "• Management dashboard",
            "• Compliance certificate"
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
        <FileCheck className="h-4 w-4" />
        <AlertDescription>
          As Accounts Incharge, you have full visibility across all stores with focus on reconciliation, financial oversight, and compliance reporting.
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
                  {section.id === 'reconciliation' && (
                    <Badge variant="default" className="ml-2">Daily Task</Badge>
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