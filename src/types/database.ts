export interface Store {
  id: string
  store_code: string
  store_name: string
  is_active: boolean
  created_at: string
}

export interface Sale {
  id: string
  store_id: string
  sale_date: string
  tender_type: 'cash' | 'credit_card' | 'upi' | 'gift_voucher'
  amount: number
  notes?: string
  created_at: string
  store?: Store
}

export interface Expense {
  id: string
  store_id: string
  expense_date: string
  category: string
  amount: number
  description?: string
  created_at: string
  store?: Store
}

export interface GiftVoucher {
  id: string
  voucher_number: string
  amount: number
  balance: number
  status: 'active' | 'redeemed' | 'cancelled'
  created_at: string
}

export interface DashboardMetrics {
  total_sales: number
  total_expenses: number
  cash_variance: number
  active_vouchers: number
  recent_sales: Sale[]
  recent_expenses: Expense[]
}