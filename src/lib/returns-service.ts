import { supabase } from './supabase'

export interface Return {
  id?: string
  store_id: string
  return_date: string
  original_bill_reference: string
  return_amount: number
  refund_method: string
  customer_name: string
  reason?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface ReturnSummary {
  id?: string
  return_date: string
  original_bill_reference: string
  return_amount: number
  refund_method: string
  customer_name: string
  reason?: string
  status?: string
  created_at?: string
  stores?: {
    store_name: string
    store_code: string
  }
}

// ==========================================
// RETURNS (RRN) MANAGEMENT
// ==========================================

export async function createReturn(returnData: Omit<Return, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('returns')
    .insert([returnData])
    .select()

  if (error) {
    console.error('Error creating return:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create return - no data returned')
  }
  
  const createdReturn = data[0]
  
  // Create cash movement if refund method is cash (negative amount for refund)
  if (returnData.refund_method?.toLowerCase() === 'cash' && returnData.store_id) {
    try {
      await supabase.rpc('create_return_cash_movement', {
        p_store_id: returnData.store_id,
        p_amount: returnData.return_amount,
        p_reference_id: createdReturn.id,
        p_bill_reference: returnData.original_bill_reference
      })
    } catch (movementError) {
      console.error('Error creating cash movement for Return:', movementError)
      // Don't fail the Return creation if movement fails
    }
  }
  
  return createdReturn
}

export async function getReturnsForDate(storeId: string, date: string): Promise<ReturnSummary[]> {
  const { data, error } = await supabase
    .from('returns')
    .select('id, return_date, original_bill_reference, return_amount, refund_method, customer_name, reason, created_at')
    .eq('store_id', storeId)
    .eq('return_date', date)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching returns for date:', error)
    return []
  }
  
  return data as ReturnSummary[]
}

export async function getTodaysReturns(storeId?: string): Promise<ReturnSummary[]> {
  const today = new Date().toISOString().split('T')[0]
  
  let query = supabase
    .from('returns')
    .select('id, return_date, original_bill_reference, return_amount, refund_method, customer_name, reason, created_at')
    .eq('return_date', today)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching today\'s returns:', error)
    return []
  }
  
  return data as ReturnSummary[]
}

export async function getReturnById(id: string): Promise<Return | null> {
  const { data, error } = await supabase
    .from('returns')
    .select('*')
    .eq('id', id)

  if (error) {
    console.error('Error fetching return:', error)
    return null
  }
  
  return data && data.length > 0 ? data[0] as Return : null
}

// Get returns for a date range with optional store filtering
export async function getReturnsForDateRange(
  fromDate: string,
  toDate: string,
  storeIds?: string[] | null
) {
  let query = supabase
    .from('returns')
    .select(`
      *,
      stores (
        store_name,
        store_code
      )
    `)
    .gte('return_date', fromDate)
    .lte('return_date', toDate)
    .order('created_at', { ascending: false })

  // If storeIds is provided and not null, filter by those stores
  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching returns for date range:', error)
    return []
  }
  
  return data as (Return & { stores: { store_name: string; store_code: string } })[]
}

export async function getReturnsByBillReference(billReference: string, storeId?: string): Promise<ReturnSummary[]> {
  let query = supabase
    .from('returns')
    .select('id, return_date, original_bill_reference, return_amount, refund_method, customer_name, reason, created_at')
    .eq('original_bill_reference', billReference)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching returns by bill reference:', error)
    return []
  }
  
  return data as ReturnSummary[]
}

export async function getReturnsByCustomer(customerName: string, storeId?: string): Promise<ReturnSummary[]> {
  let query = supabase
    .from('returns')
    .select('id, return_date, original_bill_reference, return_amount, refund_method, customer_name, reason, created_at')
    .ilike('customer_name', `%${customerName}%`)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching returns by customer:', error)
    return []
  }
  
  return data as ReturnSummary[]
}

export async function getReturnsSummary(storeId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('returns')
    .select('return_amount, refund_method, return_date')
    .eq('store_id', storeId)
    .gte('return_date', startDate)
    .lte('return_date', endDate)

  if (error) {
    console.error('Error fetching returns summary:', error)
    return { totalAmount: 0, totalCount: 0, byRefundMethod: {} }
  }

  const totalAmount = data.reduce((sum, ret) => sum + ret.return_amount, 0)
  const totalCount = data.length

  const byRefundMethod = data.reduce((acc: Record<string, { count: number; amount: number }>, ret) => {
    if (!acc[ret.refund_method]) {
      acc[ret.refund_method] = { count: 0, amount: 0 }
    }
    acc[ret.refund_method].count += 1
    acc[ret.refund_method].amount += ret.return_amount
    return acc
  }, {})

  return {
    totalAmount,
    totalCount,
    byRefundMethod
  }
}

export async function updateReturn(id: string, updates: Partial<Return>) {
  const { error } = await supabase
    .from('returns')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating return:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updates
  }
}

export async function deleteReturn(id: string) {
  const { error } = await supabase
    .from('returns')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting return:', error)
    throw new Error(error.message)
  }
}

export async function getRecentReturns(limit: number = 50, storeId?: string): Promise<ReturnSummary[]> {
  let query = supabase
    .from('returns')
    .select('id, return_date, original_bill_reference, return_amount, refund_method, customer_name, reason, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching recent returns:', error)
    return []
  }
  
  return data as ReturnSummary[]
}