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
  Home
} from "lucide-react"

interface StoreManagerHelpProps {
  searchQuery: string
  activeSection?: string
}

export function StoreManagerHelp({ searchQuery, activeSection }: StoreManagerHelpProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["daily-ops"])
  
  // Update expanded sections when activeSection changes
  useEffect(() => {
    if (activeSection && activeSection !== 'overview') {
      // Map activeSection to the corresponding section id
      const sectionMap: Record<string, string> = {
        'daily-ops': 'daily-ops',
        'transactions': 'sales',
        'cash-mgmt': 'cash-mgmt',
        'guidelines': 'guidelines'
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
      title: "Daily Operations Workflow",
      icon: Clock,
      content: [
        {
          title: "Opening Procedures (Start of Day)",
          path: "Dashboard → Cash Management → Adjustments",
          steps: [
            "Initial Setup (First Day Only):",
            "• Navigate to Cash Management → Adjustments",
            "• Select 'Initial Setup' as adjustment type",
            "• Enter opening petty cash amount (typically ₹5,000)",
            "• Provide reason: 'Initial petty cash fund for [Store Name]'",
            "• Submit for Super User approval",
            "",
            "Daily Opening:",
            "• Check dashboard for overnight notifications",
            "• Review previous day's closing balance",
            "• Verify petty cash availability",
            "• Check pending approvals status"
          ]
        },
        {
          title: "Cash Counting (10:30-11:30 AM Daily)",
          path: "Dashboard → Cash Management → Cash Count",
          steps: [
            "• Navigate to Cash Count section",
            "• Select count type (Sales Drawer / Petty Cash)",
            "• Count physical cash by denomination:",
            "  - ₹2000, ₹500, ₹200, ₹100 notes",
            "  - ₹50, ₹20, ₹10 notes",
            "  - Coins",
            "• Enter quantities for each denomination",
            "• System calculates total and variance",
            "• Review variance (Alert if >₹100 for sales, >₹50 for petty)",
            "• Add notes if variance exists",
            "• Submit count"
          ]
        },
        {
          title: "End of Day Procedures",
          path: "Dashboard → Cash Management",
          steps: [
            "• Complete final cash count",
            "• Review all pending transactions",
            "• Ensure all hand bills are entered",
            "• Check variance reports",
            "• Prepare bank deposit for sales cash",
            "• Verify next day's petty cash availability",
            "• Log out of system"
          ]
        }
      ]
    },
    {
      id: "sales",
      title: "Sales Management",
      icon: ShoppingCart,
      content: [
        {
          title: "Recording Sales",
          path: "Dashboard → Sales → Create Sale",
          steps: [
            "• Click 'New Sale' button",
            "• Select tender type:",
            "  - Cash: Direct payment",
            "  - Credit Card: Add last 4 digits",
            "  - UPI: Enter transaction ID",
            "  - Gift Voucher: Enter voucher number",
            "• Enter sale amount",
            "• Add transaction reference for non-cash",
            "• Optional: Add customer reference",
            "• Optional: Add notes",
            "• Click 'Create Sale'"
          ]
        },
        {
          title: "Sales Orders (Advance Bookings)",
          path: "Dashboard → Sales Orders",
          steps: [
            "Creating Orders:",
            "• Click 'New Sales Order'",
            "• Enter customer details (name, phone)",
            "• Add items description",
            "• Enter total amount",
            "• Record advance payment",
            "• Set delivery date",
            "• Save order",
            "",
            "Managing Orders:",
            "• Track status: Pending → Confirmed → Delivered",
            "• Update when items ready",
            "• Collect balance payment",
            "• Convert to final sale upon delivery"
          ]
        }
      ]
    },
    {
      id: "returns",
      title: "Returns Processing",
      icon: RotateCcw,
      content: [
        {
          title: "Handling Returns",
          path: "Dashboard → Returns",
          steps: [
            "• Click 'Process Return'",
            "• Enter original bill reference",
            "• Specify return amount",
            "• Select refund method:",
            "  - Cash (from petty cash)",
            "  - Store credit",
            "  - Original payment method",
            "• Document detailed reason",
            "• Add any relevant notes",
            "• Process refund",
            "• Provide return receipt to customer"
          ]
        }
      ]
    },
    {
      id: "vouchers",
      title: "Gift Voucher Management",
      icon: Gift,
      content: [
        {
          title: "Issuing Vouchers",
          path: "Dashboard → Vouchers → Issue",
          steps: [
            "• Click 'Issue New Voucher'",
            "• Enter voucher amount",
            "• Add customer details:",
            "  - Name (required)",
            "  - Phone number (required)",
            "• Select payment method received",
            "• System auto-generates voucher number",
            "• Set expiry date if applicable",
            "• Print/share voucher with customer"
          ]
        },
        {
          title: "Redeeming Vouchers",
          path: "Dashboard → Vouchers → Redeem",
          steps: [
            "• Navigate to Redeem section",
            "• Enter voucher number",
            "• System validates and shows:",
            "  - Current balance",
            "  - Expiry status",
            "  - Customer details",
            "• Process full or partial redemption",
            "• Update voucher balance"
          ]
        }
      ]
    },
    {
      id: "expenses",
      title: "Expense Tracking",
      icon: FileText,
      content: [
        {
          title: "Recording Store Expenses",
          path: "Dashboard → Expenses",
          steps: [
            "• Click 'New Expense'",
            "• Select expense category",
            "• Enter exact amount",
            "• Write clear description",
            "• Upload receipt/voucher image:",
            "  - Take clear photo",
            "  - Ensure details visible",
            "• Verify petty cash balance",
            "• Submit expense",
            "• File physical receipt"
          ]
        }
      ]
    },
    {
      id: "cash-mgmt",
      title: "Cash Management",
      icon: DollarSign,
      content: [
        {
          title: "Requesting Petty Cash",
          path: "Dashboard → Cash Management → Transfers",
          steps: [
            "• Go to Cash Transfers",
            "• Click 'Request Transfer'",
            "• Enter required amount",
            "• Provide detailed reason",
            "• Select priority level:",
            "  - High: Urgent (same day)",
            "  - Medium: Within 24 hours",
            "  - Low: Can wait 24-48 hours",
            "• Review current balances",
            "• Submit for approval"
          ]
        },
        {
          title: "Cash Adjustments",
          path: "Dashboard → Cash Management → Adjustments",
          steps: [
            "• Navigate to Adjustments",
            "• Select adjustment type:",
            "  - Initial Setup: First-time setup",
            "  - Correction: Fix counting errors",
            "  - Injection: Add emergency funds",
            "  - Loss: Report theft/shortage",
            "• Select account (Petty/Sales Cash)",
            "• Enter adjustment amount",
            "• Provide detailed justification",
            "• Submit for Super User approval"
          ]
        }
      ]
    },
    {
      id: "handbills",
      title: "Hand Bills",
      icon: FileText,
      content: [
        {
          title: "Creating Manual Bills",
          path: "Dashboard → Hand Bills",
          steps: [
            "• Click 'Add Hand Bill'",
            "• Enter bill number (if available)",
            "• Input total amount",
            "• Select payment type",
            "• Add customer name",
            "• Describe items briefly",
            "• Take clear photo of bill",
            "• Upload image",
            "• Save hand bill",
            "• Can convert to system sale later"
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
          title: "Managing Customers",
          path: "Dashboard → Customers",
          steps: [
            "Adding Customers:",
            "• Click 'Add Customer'",
            "• Enter phone number (unique)",
            "• Add customer name",
            "• Optional: Email, address",
            "• Set credit limit if applicable",
            "• Save customer record",
            "",
            "Tracking Customers:",
            "• Search by phone/name",
            "• View purchase history",
            "• Check outstanding balance",
            "• Monitor credit utilization"
          ]
        }
      ]
    },
    {
      id: "transactions",
      title: "Transaction Types & Lifecycles",
      icon: FileText,
      content: [
        {
          title: "Sales Orders (SO) - Advance Bookings",
          path: "Dashboard → Sales Orders",
          steps: [
            "Purpose: Customer orders with advance payment for future delivery",
            "",
            "Creating Sales Order:",
            "1. Click 'New Sales Order'",
            "2. Enter customer details (name, phone)",
            "3. Add item descriptions",
            "4. Set total amount and delivery date",
            "5. Record advance payment received",
            "6. Save order - generates unique SO number",
            "",
            "Managing Orders:",
            "• Track order status: Pending → Confirmed → Delivered",
            "• Monitor outstanding balance",
            "• Update when items are ready",
            "• Collect balance payment on delivery",
            "• Convert to final sale transaction",
            "",
            "Key Points:",
            "• Advance affects sales cash immediately",
            "• Balance due shown on order",
            "• Customer contact retained for follow-up"
          ]
        },
        {
          title: "Hand Bills (HB) - Manual Receipts",
          path: "Dashboard → Hand Bills",
          steps: [
            "Purpose: Capture handwritten bills into the system",
            "",
            "Recording Hand Bill:",
            "1. Click 'Add Hand Bill'",
            "2. Enter bill number (if available)",
            "3. Input total amount from receipt",
            "4. Select payment type used",
            "5. Add customer name",
            "6. Describe items briefly",
            "7. Take clear photo of physical bill",
            "8. Upload image and save",
            "",
            "Important Notes:",
            "• Prevents revenue leakage",
            "• Image required for verification",
            "• Can convert to system sale later",
            "• Counts toward daily sales immediately"
          ]
        },
        {
          title: "Returns (RRN) - Processing Refunds",
          path: "Dashboard → Returns",
          steps: [
            "Purpose: Handle customer returns and refunds",
            "",
            "Processing Return:",
            "1. Click 'Process Return'",
            "2. Enter original bill reference",
            "3. Specify return amount",
            "4. Select refund method:",
            "   - Cash (from petty cash)",
            "   - Store credit",
            "   - Original payment method",
            "5. Document detailed reason",
            "6. Process refund",
            "7. Provide return receipt",
            "",
            "Important:",
            "• Cash refunds reduce petty cash",
            "• High-value returns may need approval",
            "• Always link to original transaction"
          ]
        },
        {
          title: "Gift Vouchers (GV) - Store Credit",
          path: "Dashboard → Vouchers",
          steps: [
            "Purpose: Issue and redeem gift certificates",
            "",
            "Issuing Voucher:",
            "1. Click 'Issue New Voucher'",
            "2. Enter voucher amount",
            "3. Add customer details (name, phone)",
            "4. Select payment method received",
            "5. System generates unique voucher number",
            "6. Set expiry date if needed",
            "7. Print/share voucher with customer",
            "",
            "Redeeming Voucher:",
            "1. Navigate to Redeem section",
            "2. Enter voucher number",
            "3. System shows balance and validity",
            "4. Process full or partial redemption",
            "5. Balance updates automatically",
            "",
            "Key Features:",
            "• Acts as tender type for payments",
            "• Tracks balance and history",
            "• Expires automatically when set"
          ]
        },
        {
          title: "Daily Transaction Flow",
          path: "",
          steps: [
            "Morning (Opening):",
            "• Review pending Sales Orders",
            "• Check for deliveries scheduled today",
            "• Verify gift voucher validity",
            "",
            "Throughout Day:",
            "• Record all sales promptly",
            "• Enter hand bills as they occur",
            "• Process returns immediately",
            "• Issue vouchers when purchased",
            "",
            "Evening (Closing):",
            "• Ensure all hand bills are entered",
            "• Complete any pending SO deliveries",
            "• Review day's returns",
            "• Verify all transactions recorded",
            "",
            "Status Management:",
            "• All transactions start as 'pending'",
            "• AIC reconciles daily",
            "• Edit only while status is 'pending'",
            "• Reconciled transactions are locked"
          ]
        }
      ]
    },
    {
      id: "guidelines",
      title: "Important Guidelines",
      icon: AlertTriangle,
      content: [
        {
          title: "Cash Rules",
          path: "",
          steps: [
            "• Sales cash must be deposited daily by 11:30 AM",
            "• All expenses paid from petty cash only",
            "• Never mix sales cash with petty cash",
            "• Request petty cash transfer before it runs out",
            "• Document all adjustments with clear reasons",
            "• Count cash at consistent times (10:30-11:30 AM)"
          ]
        },
        {
          title: "Approval Requirements",
          path: "",
          steps: [
            "• Cash transfers need Super User approval",
            "• All adjustments require approval",
            "• High-value returns may need authorization",
            "• Initial setup always needs approval"
          ]
        },
        {
          title: "Best Practices",
          path: "",
          steps: [
            "• Upload clear images for all documents",
            "• Maintain detailed notes for audit trail",
            "• Review variance reports daily",
            "• Reconcile before closing each day",
            "• Keep physical receipts organized",
            "• Train cashiers on procedures regularly"
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
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          As a Store Manager, you have full access to daily operations and can request cash adjustments with approval.
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