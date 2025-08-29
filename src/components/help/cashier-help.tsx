"use client"

import { useState, useEffect } from "react"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  ChevronRight, 
  Clock, 
  ShoppingCart,
  FileText,
  Gift,
  RotateCcw,
  Users,
  Calculator,
  Package,
  AlertTriangle,
  XCircle,
  Home,
  CheckSquare
} from "lucide-react"

interface CashierHelpProps {
  searchQuery: string
  activeSection?: string
}

export function CashierHelp({ searchQuery, activeSection }: CashierHelpProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["daily-ops"])
  
  // Update expanded sections when activeSection changes
  useEffect(() => {
    if (activeSection && activeSection !== 'overview') {
      // Map activeSection to the corresponding section id
      const sectionMap: Record<string, string> = {
        'daily-ops': 'daily-ops',
        'transactions': 'sales',
        'cash-mgmt': 'cash-counting',
        'guidelines': 'rules'
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
      title: "Daily Operations",
      icon: Clock,
      content: [
        {
          title: "Starting Your Shift",
          path: "Dashboard",
          steps: [
            "• Sign in with your Google account",
            "• Dashboard shows today's summary",
            "• Check notifications for any alerts",
            "• Review current cash position",
            "• Verify you have access to necessary modules",
            "• Report any system issues to manager"
          ]
        },
        {
          title: "Daily Checklist",
          path: "",
          steps: [
            "☐ Login at shift start",
            "☐ Check opening notifications",
            "☐ Record all transactions promptly",
            "☐ Upload hand bill images",
            "☐ File physical receipts",
            "☐ Count cash if requested",
            "☐ Report any issues to manager",
            "☐ Logout at shift end"
          ]
        }
      ]
    },
    {
      id: "sales",
      title: "Processing Sales",
      icon: ShoppingCart,
      content: [
        {
          title: "Recording Transactions",
          path: "Dashboard → Sales → Create Sale",
          steps: [
            "• Click 'New Sale' button",
            "• Choose payment method:",
            "  - Cash: Enter exact amount received",
            "  - Credit Card: Add last 4 digits as reference",
            "  - UPI: Enter transaction ID",
            "  - Gift Voucher: Use voucher number",
            "• Enter sale amount",
            "• Add customer reference if available",
            "• Save transaction",
            "• Provide receipt to customer"
          ]
        },
        {
          title: "Sales Orders (Advance Bookings)",
          path: "Dashboard → Sales Orders",
          steps: [
            "Taking New Orders:",
            "• Click 'New Sales Order'",
            "• Fill customer information:",
            "  - Name (required)",
            "  - Phone number (required)",
            "  - Delivery date",
            "• Enter item details",
            "• Record advance payment amount",
            "• Note remaining balance",
            "• Give order copy to customer",
            "",
            "Completing Orders:",
            "• Search order by number/customer",
            "• Verify items ready",
            "• Collect balance payment",
            "• Update status to 'Delivered'",
            "• Convert to final sale"
          ]
        }
      ]
    },
    {
      id: "returns",
      title: "Processing Returns",
      icon: RotateCcw,
      content: [
        {
          title: "Handling Customer Returns",
          path: "Dashboard → Returns",
          steps: [
            "• Click 'Process Return'",
            "• Ask customer for original bill",
            "• Enter bill reference number",
            "• Specify return amount",
            "• Choose refund method:",
            "  - Cash (from petty cash)",
            "  - Store credit",
            "  - Original payment method",
            "• Get manager approval for high-value returns",
            "• Process return",
            "• Give return receipt to customer",
            "• File documentation"
          ]
        }
      ]
    },
    {
      id: "vouchers",
      title: "Gift Vouchers",
      icon: Gift,
      content: [
        {
          title: "Selling Gift Vouchers",
          path: "Dashboard → Vouchers → Issue",
          steps: [
            "• Click 'Issue New Voucher'",
            "• Enter voucher amount",
            "• Record customer details:",
            "  - Name",
            "  - Phone number",
            "• Select payment received",
            "• System generates voucher number",
            "• Print/write voucher for customer",
            "• Explain validity period",
            "• Keep copy for records"
          ]
        },
        {
          title: "Redeeming Vouchers",
          path: "Dashboard → Vouchers → Redeem",
          steps: [
            "• Go to Redeem section",
            "• Enter voucher number",
            "• Verify customer details",
            "• Check available balance",
            "• Process redemption amount",
            "• Return voucher if partial use",
            "• Update system balance"
          ]
        }
      ]
    },
    {
      id: "expenses",
      title: "Recording Expenses",
      icon: FileText,
      content: [
        {
          title: "Petty Cash Expenses",
          path: "Dashboard → Expenses",
          steps: [
            "• Click 'Add Expense'",
            "• Select category (Tea/Coffee, Supplies, etc.)",
            "• Enter exact amount",
            "• Write clear description",
            "• Take photo of receipt/bill",
            "• Upload image (ensure clarity)",
            "• Save expense",
            "• File physical receipt in folder",
            "• Note: All expenses from petty cash only"
          ]
        }
      ]
    },
    {
      id: "handbills",
      title: "Hand Bills (Manual Receipts)",
      icon: FileText,
      content: [
        {
          title: "Recording Manual Sales",
          path: "Dashboard → Hand Bills",
          steps: [
            "• For handwritten bills only",
            "• Click 'Add Hand Bill'",
            "• Enter bill number (if any)",
            "• Input total amount",
            "• Select payment type",
            "• Add customer name",
            "• Describe items briefly",
            "• Take clear photo of bill",
            "• Upload and save",
            "• Keep original bill"
          ]
        }
      ]
    },
    {
      id: "customers",
      title: "Customer Management",
      icon: Users,
      content: [
        {
          title: "Looking Up Customers",
          path: "Dashboard → Customers",
          steps: [
            "• Search by phone number",
            "• View purchase history",
            "• Check outstanding credit",
            "• Note credit limit",
            "• See contact details"
          ]
        },
        {
          title: "Adding New Customers",
          path: "Dashboard → Customers → Add",
          steps: [
            "• Click 'Add Customer'",
            "• Enter phone number",
            "• Check for duplicates",
            "• Add customer name",
            "• Optional: Email, address",
            "• Save customer record"
          ]
        }
      ]
    },
    {
      id: "cash-counting",
      title: "Cash Procedures",
      icon: Calculator,
      content: [
        {
          title: "Cash Counting (When Requested)",
          path: "Dashboard → Cash Management → Cash Count",
          steps: [
            "• Manager may ask you to count cash",
            "• Go to Cash Count section",
            "• Count each denomination carefully:",
            "  - ₹2000 notes",
            "  - ₹500 notes",
            "  - ₹200 notes",
            "  - ₹100 notes",
            "  - ₹50 notes",
            "  - ₹20 notes",
            "  - ₹10 notes",
            "  - Coins",
            "• Enter quantities",
            "• System calculates total",
            "• Submit count to manager"
          ]
        }
      ]
    },
    {
      id: "rules",
      title: "Important Rules",
      icon: AlertTriangle,
      content: [
        {
          title: "Cash Handling Rules",
          path: "",
          steps: [
            "• Never mix sales cash with petty cash",
            "• Count carefully when giving change",
            "• Verify high-denomination notes",
            "• Report discrepancies immediately",
            "• Keep cash drawer organized",
            "• Never leave cash unattended"
          ]
        },
        {
          title: "Documentation Rules",
          path: "",
          steps: [
            "• Every transaction must be recorded",
            "• No sales without entry in system",
            "• Upload images for all hand bills",
            "• Keep receipts organized",
            "• File documents daily",
            "• Report missing receipts"
          ]
        },
        {
          title: "Customer Service",
          path: "",
          steps: [
            "• Always provide receipts",
            "• Verify voucher validity",
            "• Check return policies",
            "• Be courteous with complaints",
            "• Call manager for disputes",
            "• Maintain professional behavior"
          ]
        },
        {
          title: "Security Guidelines",
          path: "",
          steps: [
            "• Never share your login credentials",
            "• Lock screen when away from desk",
            "• Report suspicious activity",
            "• Follow cash handling limits",
            "• Don't process unauthorized refunds",
            "• Alert manager to system issues"
          ]
        }
      ]
    },
    {
      id: "restrictions",
      title: "What You Cannot Do",
      icon: XCircle,
      content: [
        {
          title: "System Restrictions",
          path: "",
          steps: [
            "❌ Cannot approve cash transfers",
            "❌ Cannot make cash adjustments",
            "❌ Cannot modify completed transactions",
            "❌ Cannot delete any records",
            "❌ Cannot access other store's data",
            "❌ Cannot change system settings",
            "❌ Cannot override price limits",
            "❌ Cannot process refunds without approval",
            "❌ Cannot access financial reports",
            "❌ Cannot modify customer credit limits"
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
        <CheckSquare className="h-4 w-4" />
        <AlertDescription>
          As a Cashier, you can process daily transactions and record expenses. Contact your Store Manager for approvals and assistance.
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
                  {section.id === "restrictions" && (
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

      <Alert className="mt-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Getting Help:</strong> For technical issues contact IT support. For policy questions ask your Store Manager. 
          For urgent matters call Super User. For training request from Store Manager.
        </AlertDescription>
      </Alert>
    </div>
  )
}