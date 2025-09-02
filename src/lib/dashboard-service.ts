import { format } from "date-fns"
import { getSalesForDateRange } from './sales-service'
import { getExpensesForDateRange } from './expense-service'
import { getVouchersForDateRange } from './gift-vouchers-service'
import { getHandBillsForDateRange } from './hand-bills-service'
import { getReturnsForDateRange } from './returns-service'
import { calculateExpectedCashAmount, getLatestCashCount, getCurrentAccountBalance } from './cash-service'
import { supabase } from './supabase'

export interface DashboardData {
  totalSales: number
  totalExpenses: number
  totalHandBills: number
  totalReturns: number
  
  // Cash Positions (replacing netPosition)
  salesCashBalance: number  // Current sales cash (actual if counted, else expected)
  pettyCashBalance: number  // Current petty cash (actual if counted, else expected)
  pendingDepositAmount: number  // Amount pending to be deposited
  todayExpenses: number  // Today's expenses from petty cash
  
  // Cash Management
  cashVariance: number
  salesCashExpected: number
  salesCashActual: number
  pettyCashExpected: number
  pettyCashActual: number
  
  // Vouchers
  activeVouchers: number
  vouchersOutstanding: number
  
  // Recent Activity
  recentSales: any[]
  recentExpenses: any[]
  
  // KPIs
  totalTransactions: number
  averageTransactionValue: number
  
  // Pending Items
  pendingApprovals: number
  lowCashAlert: boolean
}

export interface DashboardFilters {
  dateFrom: string
  dateTo: string
  storeIds: string[] | null // null means all accessible stores
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const { dateFrom, dateTo, storeIds } = filters
  
  try {
    // Load all data in parallel
    const [
      salesData,
      expensesData, 
      vouchersData,
      handBillsData,
      returnsData,
      cashVarianceData
    ] = await Promise.all([
      getSalesForDateRange(dateFrom, dateTo, storeIds),
      getExpensesForDateRange(dateFrom, dateTo, storeIds),
      getVouchersForDateRange(dateFrom, dateTo),
      getHandBillsForDateRange(dateFrom, dateTo, storeIds),
      getReturnsForDateRange(dateFrom, dateTo, storeIds),
      getCashVarianceForStores(storeIds, dateTo)
    ])
    
    // Calculate totals
    const totalSales = (salesData || []).reduce((sum, sale) => sum + sale.amount, 0)
    const totalExpenses = (expensesData || []).reduce((sum, expense) => sum + expense.amount, 0)
    const totalHandBills = (handBillsData || []).reduce((sum, bill) => sum + bill.total_amount, 0)
    const totalReturns = (returnsData || []).reduce((sum, ret) => sum + ret.return_amount, 0)
    
    // Calculate voucher metrics
    const activeVouchers = (vouchersData || []).filter(v => v.status === 'active').length
    const vouchersOutstanding = (vouchersData || [])
      .filter(v => v.status === 'active')
      .reduce((sum, v) => sum + v.balance, 0)
    
    // Get recent activity (last 5 items)
    const recentSales = (salesData || [])
      .filter(sale => sale.created_at)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 5)
    
    const recentExpenses = (expensesData || [])
      .filter(expense => expense.created_at)
      .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())
      .slice(0, 5)
    
    // Calculate KPIs
    const totalTransactions = (salesData || []).length + (expensesData || []).length + 
                              (handBillsData || []).length + (returnsData || []).length
    const averageTransactionValue = totalTransactions > 0 ? 
      (totalSales + totalHandBills) / ((salesData || []).length + (handBillsData || []).length) : 0
    
    // Get pending approvals count
    const pendingApprovals = await getPendingApprovalsCount(storeIds)
    
    // Calculate today's expenses total
    const todayExpenses = (expensesData || []).reduce((sum, expense) => sum + expense.amount, 0)
    
    // Get pending deposit amount (sales cash that needs to be deposited)
    const pendingDepositAmount = await getPendingDepositAmount(storeIds)
    
    // Use actual balance (which already has the correct current balance)
    // The 'actual' values are either counted amounts or current balance if not counted
    const salesCashBalance = cashVarianceData.salesCashActual
    const pettyCashBalance = cashVarianceData.pettyCashActual
    
    return {
      totalSales,
      totalExpenses,
      totalHandBills,
      totalReturns,
      
      // New cash position fields
      salesCashBalance,
      pettyCashBalance,
      pendingDepositAmount,
      todayExpenses,
      
      // Cash variance data
      cashVariance: cashVarianceData.totalVariance,
      salesCashExpected: cashVarianceData.salesCashExpected,
      salesCashActual: cashVarianceData.salesCashActual,
      pettyCashExpected: cashVarianceData.pettyCashExpected,
      pettyCashActual: cashVarianceData.pettyCashActual,
      
      activeVouchers,
      vouchersOutstanding,
      recentSales,
      recentExpenses,
      totalTransactions,
      averageTransactionValue,
      pendingApprovals,
      lowCashAlert: cashVarianceData.lowCashAlert
    }
    
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    throw new Error('Failed to load dashboard data')
  }
}

async function getCashVarianceForStores(storeIds: string[] | null, date: string) {
  if (!storeIds || storeIds.length === 0) {
    return {
      totalVariance: 0,
      salesCashExpected: 0,
      salesCashActual: 0,
      pettyCashExpected: 0,
      pettyCashActual: 0,
      lowCashAlert: false
    }
  }
  
  let totalVariance = 0
  let salesCashExpected = 0
  let salesCashActual = 0
  let pettyCashExpected = 0
  let pettyCashActual = 0
  let lowCashAlert = false
  
  // Calculate variance for each store and sum them up
  for (const storeId of storeIds) {
    try {
      // Get current account balances (this includes all adjustments and is more accurate)
      const salesCurrentBalance = await getCurrentAccountBalance(storeId, 'sales_cash')
      const pettyCurrentBalance = await getCurrentAccountBalance(storeId, 'petty_cash')
      
      // Get latest counts for actual amounts
      const salesCount = await getLatestCashCount(storeId, 'sales_drawer')
      const pettyCount = await getLatestCashCount(storeId, 'petty_cash')
      
      const salesActualAmount = salesCount?.total_counted || 0
      const pettyActualAmount = pettyCount?.total_counted || 0
      
      // Use current balance as expected (includes all adjustments)
      salesCashExpected += salesCurrentBalance
      salesCashActual += salesActualAmount || salesCurrentBalance // Use current if no count
      pettyCashExpected += pettyCurrentBalance
      pettyCashActual += pettyActualAmount || pettyCurrentBalance // Use current if no count
      
      // Calculate variance for this store
      const salesVariance = salesActualAmount ? (salesActualAmount - salesCurrentBalance) : 0
      const pettyVariance = pettyActualAmount ? (pettyActualAmount - pettyCurrentBalance) : 0
      const storeVariance = salesVariance + pettyVariance
      totalVariance += storeVariance
      
      // Check for low cash alert (petty cash below ₹2000)
      // Use actual if counted, otherwise use current balance
      const effectivePettyBalance = pettyActualAmount || pettyCurrentBalance
      if (effectivePettyBalance < 2000) {
        lowCashAlert = true
      }
    } catch (error) {
      console.error(`Error calculating cash variance for store ${storeId}:`, error)
    }
  }
  
  return {
    totalVariance,
    salesCashExpected,
    salesCashActual,
    pettyCashExpected,
    pettyCashActual,
    lowCashAlert
  }
}

async function getPendingApprovalsCount(storeIds: string[] | null): Promise<number> {
  // This would check for pending approvals across different modules
  // For now, return 0 - can be implemented based on specific approval workflows
  return 0
}

async function getPendingDepositAmount(storeIds: string[] | null): Promise<number> {
  if (!storeIds || storeIds.length === 0) return 0
  
  try {
    // Query daily_cash_positions for pending deposits
    const { data, error } = await supabase
      .from('daily_cash_positions')
      .select('closing_balance')
      .in('store_id', storeIds)
      .eq('deposit_status', 'pending')
      .gt('closing_balance', 0)
    
    if (error) {
      console.error('Error fetching pending deposits:', error)
      return 0
    }
    
    // Sum all pending deposit amounts
    return (data || []).reduce((sum, record) => sum + (record.closing_balance || 0), 0)
  } catch (error) {
    console.error('Error calculating pending deposits:', error)
    return 0
  }
}

// Helper function for date range queries
export function getDateRangeFilter(dateFrom: string, dateTo: string) {
  return {
    from: format(new Date(dateFrom), 'yyyy-MM-dd'),
    to: format(new Date(dateTo), 'yyyy-MM-dd')
  }
}