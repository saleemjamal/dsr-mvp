import { supabase } from './supabase'

export interface DenominationCount {
  [key: number]: number
}

export interface CashCount {
  id?: string
  store_id: string
  count_date: string
  count_type: 'sales_drawer' | 'petty_cash'
  denominations: DenominationCount
  total_counted: number
  expected_amount?: number
  variance?: number
  counted_by: string
  counted_at?: string
  notes?: string
}

export interface CashTransfer {
  id?: string
  store_id: string
  requested_amount: number
  approved_amount?: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  priority: 'low' | 'medium' | 'high'
  requested_by: string
  request_date?: string
  approved_by?: string
  approval_date?: string
  approval_notes?: string
  sales_cash_balance?: number
  petty_cash_balance?: number
}

export interface CashBalance {
  id?: string
  store_id: string
  balance_date: string
  sales_cash_opening: number
  petty_cash_opening: number
  sales_cash_closing?: number
  petty_cash_closing?: number
  total_cash_sales: number
  total_cash_advances: number
  total_transfers_out: number
  total_deposits: number
  total_expenses: number
  sales_cash_variance?: number
  petty_cash_variance?: number
  is_reconciled: boolean
}

// ==========================================
// CASH COUNTS
// ==========================================

export async function submitCashCount(cashCount: CashCount) {
  const { data, error } = await supabase
    .from('cash_counts')
    .insert([cashCount])
    .select()

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error('Failed to submit cash count - no data returned')
  }
  
  return data[0]
}

export async function getCashCountsForDate(storeId: string, date: string) {
  const { data, error } = await supabase
    .from('cash_counts')
    .select('*')
    .eq('store_id', storeId)
    .eq('count_date', date)
    .order('counted_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getLatestCashCount(storeId: string, countType: 'sales_drawer' | 'petty_cash') {
  const { data, error } = await supabase
    .from('cash_counts')
    .select('*')
    .eq('store_id', storeId)
    .eq('count_type', countType)
    .order('count_date', { ascending: false })
    .order('counted_at', { ascending: false })

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0]
}

// ==========================================
// CASH TRANSFERS
// ==========================================

export async function createTransferRequest(transfer: Omit<CashTransfer, 'id'>) {
  const { data, error } = await supabase
    .from('cash_transfers')
    .insert([transfer])
    .select()

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create transfer request - no data returned')
  }
  
  return data[0]
}

export async function getTransferRequests(storeId: string, status?: string) {
  let query = supabase
    .from('cash_transfers')
    .select('*')
    .eq('store_id', storeId)
    .order('request_date', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPendingApprovals() {
  const { data, error } = await supabase
    .from('cash_transfers')
    .select('*')
    .eq('status', 'pending')
    .order('request_date', { ascending: false })

  if (error) throw error
  return data
}

export async function approveTransfer(
  transferId: string, 
  approvedAmount: number, 
  approvalNotes?: string
) {
  const { error } = await supabase
    .from('cash_transfers')
    .update({
      status: 'approved',
      approved_amount: approvedAmount,
      approval_notes: approvalNotes,
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approval_date: new Date().toISOString()
    })
    .eq('id', transferId)

  if (error) throw error
  
  return {
    id: transferId,
    status: 'approved',
    approved_amount: approvedAmount,
    approval_notes: approvalNotes
  }
}

export async function rejectTransfer(transferId: string, rejectionNotes: string) {
  const { error } = await supabase
    .from('cash_transfers')
    .update({
      status: 'rejected',
      approval_notes: rejectionNotes,
      approved_by: (await supabase.auth.getUser()).data.user?.id,
      approval_date: new Date().toISOString()
    })
    .eq('id', transferId)

  if (error) throw error
  
  return {
    id: transferId,
    status: 'rejected',
    approval_notes: rejectionNotes
  }
}

// ==========================================
// CASH BALANCES
// ==========================================

export async function getCurrentCashBalance(storeId: string, date: string = new Date().toISOString().split('T')[0]) {
  const { data, error } = await supabase
    .from('cash_balances')
    .select('*')
    .eq('store_id', storeId)
    .eq('balance_date', date)

  if (error && error.code !== 'PGRST116') throw error
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0]
}

export async function updateCashBalance(balance: Partial<CashBalance> & { store_id: string; balance_date: string }) {
  const { data, error } = await supabase
    .from('cash_balances')
    .upsert([balance], { 
      onConflict: 'store_id,balance_date',
      ignoreDuplicates: false 
    })
    .select()

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error('Failed to update cash balance - no data returned')
  }
  
  return data[0]
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export async function calculateExpectedCashAmount(
  storeId: string, 
  accountType: 'sales_cash' | 'petty_cash',
  date: string = new Date().toISOString().split('T')[0]
): Promise<number> {
  try {
    // Calculate time range: previous day 10:30 AM to current day 11:30 AM (counting time)
    const previousDay = new Date(date)
    previousDay.setDate(previousDay.getDate() - 1)
    
    const fromTime = `${previousDay.toISOString().split('T')[0]} 05:00:00` // 10:30 AM IST = 05:00 UTC
    const toTime = `${date} 06:00:00` // 11:30 AM IST = 06:00 UTC
    const currentDayStart = `${date} 05:00:00` // 10:30 AM today

    if (accountType === 'sales_cash') {
      return await calculateSalesCashExpected(storeId, fromTime, currentDayStart)
    } else {
      return await calculatePettyCashExpected(storeId, fromTime, toTime)
    }
  } catch (error) {
    console.error('Error calculating expected cash amount:', error)
    return 0
  }
}

async function calculateSalesCashExpected(storeId: string, fromTime: string, currentDayStart: string): Promise<number> {
  let total = 0

  try {
    // 1. Cash Sales (previous day only, excluding current day 10:30-11:30 AM)
    const { data: cashSales } = await supabase
      .from('sales')
      .select('amount')
      .eq('store_id', storeId)
      .eq('tender_type', 'cash')
      .gte('created_at', fromTime)
      .lt('created_at', currentDayStart)

    total += (cashSales || []).reduce((sum, sale) => sum + sale.amount, 0)

    // 2. Sales Order Advances (cash, previous day only)
    const { data: soAdvances } = await supabase
      .from('sales_orders')
      .select('advance_amount')
      .eq('store_id', storeId)
      .eq('tender_type', 'cash')
      .gte('created_at', fromTime)
      .lt('created_at', currentDayStart)

    total += (soAdvances || []).reduce((sum, order) => sum + (order.advance_amount || 0), 0)

    // 3. Gift Voucher Purchases (cash, previous day only)
    const { data: gvPurchases } = await supabase
      .from('gift_vouchers')
      .select('amount')
      .eq('store_id', storeId)
      .eq('tender_type', 'cash')
      .gte('created_at', fromTime)
      .lt('created_at', currentDayStart)

    total += (gvPurchases || []).reduce((sum, gv) => sum + gv.amount, 0)

    // 4. Hand Bill Sales (cash, when created, previous day only)
    const { data: handBills } = await supabase
      .from('hand_bills')
      .select('total_amount')
      .eq('store_id', storeId)
      .eq('tender_type', 'cash')
      .gte('created_at', fromTime)
      .lt('created_at', currentDayStart)

    total += (handBills || []).reduce((sum, hb) => sum + hb.total_amount, 0)

    // 5. Subtract: Cash Deposits (previous day)
    const { data: deposits } = await supabase
      .from('cash_counts')
      .select('total_counted')
      .eq('store_id', storeId)
      .eq('count_type', 'sales_drawer')
      .gte('counted_at', fromTime)
      .lt('counted_at', currentDayStart)

    total -= (deposits || []).reduce((sum, deposit) => sum + deposit.total_counted, 0)

    // 6. Subtract: Transfers to Petty Cash (previous day)
    const { data: transfers } = await supabase
      .from('cash_transfers')
      .select('approved_amount')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('approval_date', fromTime)
      .lt('approval_date', currentDayStart)

    total -= (transfers || []).reduce((sum, transfer) => sum + (transfer.approved_amount || 0), 0)

    return Math.max(0, total) // Sales cash cannot be negative

  } catch (error) {
    console.error('Error calculating sales cash expected:', error)
    return 0
  }
}

async function calculatePettyCashExpected(storeId: string, fromTime: string, toTime: string): Promise<number> {
  try {
    // 1. Get opening balance from previous cash count or balance record
    const { data: lastCount } = await supabase
      .from('cash_counts')
      .select('total_counted')
      .eq('store_id', storeId)
      .eq('count_type', 'petty_cash')
      .lt('counted_at', fromTime)
      .order('counted_at', { ascending: false })

    let openingBalance = lastCount?.[0]?.total_counted || 0

    // 2. Add: Transfers from Sales Cash
    const { data: transfers } = await supabase
      .from('cash_transfers')
      .select('approved_amount')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('approval_date', fromTime)
      .lt('approval_date', toTime)

    const transfersIn = (transfers || []).reduce((sum, transfer) => sum + (transfer.approved_amount || 0), 0)

    // 3. Subtract: All Expenses (previous day + morning 10:30-11:30 AM)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('store_id', storeId)
      .gte('created_at', fromTime)
      .lt('created_at', toTime)

    const totalExpenses = (expenses || []).reduce((sum, expense) => sum + expense.amount, 0)

    return Math.max(0, openingBalance + transfersIn - totalExpenses)

  } catch (error) {
    console.error('Error calculating petty cash expected:', error)
    return 0
  }
}

export async function getCashSummary(storeId: string) {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Get today's balance
    const balance = await getCurrentCashBalance(storeId, today)
    
    // Get latest cash counts
    const salesCount = await getLatestCashCount(storeId, 'sales_drawer')
    const pettyCount = await getLatestCashCount(storeId, 'petty_cash')
    
    // Get pending transfers
    const pendingTransfers = await getTransferRequests(storeId, 'pending')
    
    return {
      balance: balance || {
        sales_cash_opening: 0,
        petty_cash_opening: 0,
        total_cash_sales: 0,
        total_cash_advances: 0,
        total_transfers_out: 0,
        total_deposits: 0,
        total_expenses: 0
      },
      latestCounts: {
        salesDrawer: salesCount,
        pettyCash: pettyCount
      },
      pendingTransfers: pendingTransfers || []
    }
  } catch (error) {
    console.error('Error getting cash summary:', error)
    throw error
  }
}

// ==========================================
// CASH ADJUSTMENTS
// ==========================================

export interface CashAdjustment {
  id?: string
  store_id: string
  adjustment_type: 'initial_setup' | 'correction' | 'injection' | 'loss'
  account_type: 'sales_cash' | 'petty_cash'
  requested_amount: number
  approved_amount?: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  priority: 'low' | 'medium' | 'high'
  requested_by: string
  request_date?: string
  approved_by?: string
  approval_date?: string
  approval_notes?: string
  current_balance_snapshot?: number
  is_adjustment: boolean
}

export async function createAdjustmentRequest(adjustment: Omit<CashAdjustment, 'id' | 'is_adjustment'>) {
  // Get current balance for snapshot
  const { data: balanceData } = await supabase
    .rpc('get_current_cash_balance', {
      p_store_id: adjustment.store_id,
      p_account_type: adjustment.account_type
    })

  const { data, error } = await supabase
    .from('cash_transfers')
    .insert([{
      ...adjustment,
      is_adjustment: true,
      current_balance_snapshot: balanceData || 0,
      // Ensure loss adjustments are negative
      requested_amount: adjustment.adjustment_type === 'loss' 
        ? -Math.abs(adjustment.requested_amount)
        : Math.abs(adjustment.requested_amount)
    }])
    .select()

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create adjustment request - no data returned')
  }
  
  return data[0]
}

export async function getAdjustmentRequests(storeId?: string, status?: string) {
  let query = supabase
    .from('cash_transfers')
    .select('*')
    .eq('is_adjustment', true)
    .order('request_date', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }
  
  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPendingAdjustments() {
  const { data, error } = await supabase
    .from('cash_transfers')
    .select('*')
    .eq('is_adjustment', true)
    .eq('status', 'pending')
    .order('request_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getAdjustmentAudit(storeId?: string) {
  let query = supabase
    .from('cash_adjustment_audit')
    .select('*')
    .order('request_date', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getCurrentAccountBalance(storeId: string, accountType: 'sales_cash' | 'petty_cash') {
  const { data, error } = await supabase
    .rpc('get_current_cash_balance', {
      p_store_id: storeId,
      p_account_type: accountType
    })

  if (error) throw error
  return data || 0
}

// ==========================================
// STORES (temporary until proper auth)
// ==========================================

export async function getDefaultStore() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)

  if (error && error.code !== 'PGRST116') throw error
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0]
}