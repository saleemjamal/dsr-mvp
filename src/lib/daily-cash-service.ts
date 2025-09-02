import { supabase } from './supabase'

export interface DailyCashPosition {
  id?: string
  store_id: string
  business_date: string
  opening_balance: number
  cash_sales: number
  so_advances: number
  gift_voucher_sales: number
  hand_bill_collections: number
  petty_transfers_in: number
  other_receipts: number
  cash_returns: number
  cash_refunds: number
  petty_transfers_out: number
  cash_deposits: number
  closing_balance?: number
  deposit_status: 'pending' | 'deposited' | 'partial' | 'carried_forward'
  deposit_id?: string
  deposited_amount?: number
  deposited_at?: string
  count_id?: string
  counted_amount?: number
  count_variance?: number
  variance_reason?: string
  variance_resolved?: boolean
  is_bank_holiday?: boolean
  holiday_name?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface PendingDepositSummary {
  store_id: string
  store_name: string
  store_code: string
  oldest_pending_date: string
  latest_pending_date: string
  days_pending: number
  total_pending_amount: number
  oldest_days_ago: number
  daily_breakdown: Array<{
    date: string
    amount: number
    is_holiday: boolean
  }>
}

// Get or create today's position
export async function ensureDailyPosition(
  storeId: string, 
  date: string = new Date().toISOString().split('T')[0]
): Promise<DailyCashPosition | null> {
  // Check if position exists
  const { data: existing } = await supabase
    .from('daily_cash_positions')
    .select('*')
    .eq('store_id', storeId)
    .eq('business_date', date)
    .limit(1)

  if (existing && existing.length > 0) {
    return existing[0]
  }

  // Get yesterday's closing balance
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data: yesterdayData } = await supabase
    .from('daily_cash_positions')
    .select('closing_balance')
    .eq('store_id', storeId)
    .eq('business_date', yesterdayStr)
    .limit(1)

  const openingBalance = yesterdayData?.[0]?.closing_balance || 0

  // Create new position
  const { data: newPosition, error } = await supabase
    .from('daily_cash_positions')
    .insert([{
      store_id: storeId,
      business_date: date,
      opening_balance: openingBalance,
      deposit_status: 'pending'
    }])
    .select()

  if (error) {
    console.error('Error creating daily position:', error)
    return null
  }

  return newPosition?.[0] || null
}

// Get daily position for a specific date
export async function getDailyPosition(
  storeId: string,
  date: string
): Promise<DailyCashPosition | null> {
  const { data, error } = await supabase
    .from('daily_cash_positions')
    .select('*')
    .eq('store_id', storeId)
    .eq('business_date', date)
    .limit(1)

  if (error) {
    console.error('Error fetching daily position:', error)
    return null
  }

  return data?.[0] || null
}

// Get pending positions for deposit
export async function getPendingPositions(
  storeId: string,
  maxDays: number = 30
): Promise<DailyCashPosition[]> {
  const { data, error } = await supabase
    .from('daily_cash_positions')
    .select('*')
    .eq('store_id', storeId)
    .eq('deposit_status', 'pending')
    .gt('closing_balance', 0)
    .order('business_date', { ascending: true })
    .limit(maxDays)

  if (error) {
    console.error('Error fetching pending positions:', error)
    return []
  }

  return data || []
}

// Get pending deposit summary
export async function getPendingDepositSummary(
  storeId: string
): Promise<PendingDepositSummary | null> {
  const { data, error } = await supabase
    .from('pending_deposits_summary')
    .select('*')
    .eq('store_id', storeId)
    .limit(1)

  if (error) {
    console.error('Error fetching pending summary:', error)
    return null
  }

  return data?.[0] || null
}

// Mark positions as deposited
export async function markPositionsAsDeposited(
  positionIds: string[],
  depositId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('daily_cash_positions')
    .update({
      deposit_status: 'deposited',
      deposit_id: depositId,
      deposited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .in('id', positionIds)

  if (error) {
    console.error('Error marking positions as deposited:', error)
    return false
  }

  return true
}

// Create deposit day mappings
export async function createDepositDayMappings(
  depositId: string,
  positions: DailyCashPosition[]
): Promise<boolean> {
  const mappings = positions.map(position => ({
    deposit_id: depositId,
    daily_position_id: position.id,
    business_date: position.business_date,
    amount_included: position.closing_balance || 0
  }))

  const { error } = await supabase
    .from('deposit_day_mappings')
    .insert(mappings)

  if (error) {
    console.error('Error creating deposit mappings:', error)
    return false
  }

  return true
}

// Create multi-day deposit
export async function createMultiDayDeposit(params: {
  storeId: string
  positionIds: string[]
  depositAmount: number
  depositSlipNumber: string
  bankName: string
  depositedBy: string
  notes?: string
}): Promise<{ success: boolean; depositId?: string; error?: string }> {
  try {
    // Get positions by IDs
    const { data: positions, error: posError } = await supabase
      .from('daily_cash_positions')
      .select('*')
      .in('id', params.positionIds)
      .order('business_date', { ascending: true })

    if (posError || !positions || positions.length === 0) {
      return { success: false, error: 'Failed to fetch positions' }
    }

    // Validate amount matches
    const totalPending = positions.reduce((sum, p) => sum + (p.closing_balance || 0), 0)
    if (Math.abs(totalPending - params.depositAmount) > 0.01) {
      return { 
        success: false, 
        error: `Deposit amount (₹${params.depositAmount}) must match pending total (₹${totalPending})` 
      }
    }

    // Create deposit record
    const { data: depositData, error: depositError } = await supabase
      .from('cash_deposits')
      .insert([{
        store_id: params.storeId,
        deposit_date: new Date().toISOString().split('T')[0],
        amount: params.depositAmount,
        deposit_slip_number: params.depositSlipNumber,
        bank_name: params.bankName,
        deposited_by: params.depositedBy,
        deposited_at: new Date().toISOString(),
        notes: params.notes,
        from_date: positions[0].business_date,
        to_date: positions[positions.length - 1].business_date,
        days_included: positions.length,
        accumulated_amount: totalPending
      }])
      .select()

    if (depositError || !depositData || depositData.length === 0) {
      return { success: false, error: 'Failed to create deposit' }
    }

    const depositId = depositData[0].id

    // Mark positions as deposited
    await markPositionsAsDeposited(params.positionIds, depositId)

    // Create day mappings
    await createDepositDayMappings(depositId, positions)

    // Create cash movement (negative to reduce balance)
    const { error: movementError } = await supabase
      .from('cash_movements')
      .insert([{
        store_id: params.storeId,
        movement_date: new Date().toISOString().split('T')[0],
        movement_type: 'deposit',
        account_type: 'sales_cash',
        amount: -params.depositAmount,
        reference_type: 'deposit',
        reference_id: depositId,
        description: `Bank deposit - ${params.depositSlipNumber}`,
        created_by: params.depositedBy
      }])

    if (movementError) {
      console.error('Error creating deposit movement:', movementError)
      // Continue anyway - deposit is recorded
    }

    return { success: true, depositId }
  } catch (error) {
    console.error('Error in createMultiDayDeposit:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

// Get daily positions for date range
export async function getDailyPositionsRange(
  storeId: string,
  fromDate: string,
  toDate: string
): Promise<DailyCashPosition[]> {
  const { data, error } = await supabase
    .from('daily_cash_positions')
    .select('*')
    .eq('store_id', storeId)
    .gte('business_date', fromDate)
    .lte('business_date', toDate)
    .order('business_date', { ascending: false })

  if (error) {
    console.error('Error fetching daily positions range:', error)
    return []
  }

  return data || []
}

// Calculate variance tolerance based on days accumulated
export function calculateVarianceTolerance(daysAccumulated: number): number {
  const baseTolerance = 100 // Base tolerance per day
  // Scale tolerance with square root of days (statistical variance scaling)
  return baseTolerance * Math.sqrt(daysAccumulated)
}

// Check if deposit is overdue
export function isDepositOverdue(oldestPendingDate: string): boolean {
  const daysOld = Math.floor(
    (Date.now() - new Date(oldestPendingDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysOld > 3
}

// Get deposit urgency level
export function getDepositUrgency(oldestPendingDate: string): 'normal' | 'warning' | 'critical' {
  const daysOld = Math.floor(
    (Date.now() - new Date(oldestPendingDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  
  if (daysOld > 3) return 'critical'
  if (daysOld === 3) return 'warning'
  return 'normal'
}