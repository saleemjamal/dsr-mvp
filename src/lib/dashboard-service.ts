import { format } from "date-fns"
import { getSalesForDateRange } from './sales-service'
import { getExpensesForDateRange } from './expense-service'
import { getVouchersForDateRange } from './gift-vouchers-service'
import { getHandBillsForDateRange } from './hand-bills-service'
import { getReturnsForDateRange } from './returns-service'
import { calculateExpectedCashAmount, getLatestCashCount } from './cash-service'
import { supabase } from './supabase'

export interface DashboardData {
  totalSales: number
  totalExpenses: number
  totalHandBills: number
  totalReturns: number
  netPosition: number
  
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
    
    // Net position calculation 
    const netPosition = totalSales + totalHandBills - totalExpenses - totalReturns
    
    return {
      totalSales,
      totalExpenses,
      totalHandBills,
      totalReturns,
      netPosition,
      
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
      // Get expected amounts
      const salesExpected = await calculateExpectedCashAmount(storeId, 'sales_cash', date)
      const pettyExpected = await calculateExpectedCashAmount(storeId, 'petty_cash', date)
      
      // Get latest counts
      const salesCount = await getLatestCashCount(storeId, 'sales_drawer')
      const pettyCount = await getLatestCashCount(storeId, 'petty_cash')
      
      const salesActualAmount = salesCount?.total_counted || 0
      const pettyActualAmount = pettyCount?.total_counted || 0
      
      // Add to totals
      salesCashExpected += salesExpected
      salesCashActual += salesActualAmount
      pettyCashExpected += pettyExpected
      pettyCashActual += pettyActualAmount
      
      // Calculate variance for this store
      const storeVariance = (salesActualAmount - salesExpected) + (pettyActualAmount - pettyExpected)
      totalVariance += storeVariance
      
      // Check for low cash alert (petty cash below ₹2000)
      if (pettyActualAmount < 2000) {
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

// Helper function for date range queries
export function getDateRangeFilter(dateFrom: string, dateTo: string) {
  return {
    from: format(new Date(dateFrom), 'yyyy-MM-dd'),
    to: format(new Date(dateTo), 'yyyy-MM-dd')
  }
}