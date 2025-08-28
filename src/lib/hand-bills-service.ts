import { supabase } from './supabase'

export interface HandBill {
  id?: string
  store_id: string
  bill_date: string
  bill_number?: string
  total_amount: number
  tender_type: string
  customer_name?: string
  items_description?: string
  image_url?: string
  status?: 'pending' | 'converted' | 'cancelled'
  converted_sale_id?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface HandBillSummary {
  id?: string
  bill_date: string
  bill_number?: string
  total_amount: number
  tender_type: string
  customer_name?: string
  status?: string
  image_url?: string
  created_at?: string
  stores?: {
    store_name: string
    store_code: string
  }
}

// ==========================================
// HAND BILLS MANAGEMENT
// ==========================================

export async function createHandBill(handBill: Omit<HandBill, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('hand_bills')
    .insert([{
      ...handBill,
      status: handBill.status || 'pending'
    }])
    .select()
    .limit(1)

  if (error) {
    console.error('Error creating hand bill:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create hand bill - no data returned')
  }
  
  return data[0]
}

export async function getHandBillsForDate(storeId: string, date: string): Promise<HandBillSummary[]> {
  const { data, error } = await supabase
    .from('hand_bills')
    .select('id, bill_date, bill_number, total_amount, tender_type, customer_name, status, image_url, created_at')
    .eq('store_id', storeId)
    .eq('bill_date', date)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching hand bills for date:', error)
    return []
  }
  
  return data as HandBillSummary[]
}

export async function getTodaysHandBills(storeId?: string): Promise<HandBillSummary[]> {
  const today = new Date().toISOString().split('T')[0]
  
  let query = supabase
    .from('hand_bills')
    .select('id, bill_date, bill_number, total_amount, tender_type, customer_name, status, created_at')
    .eq('bill_date', today)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching today\'s hand bills:', error)
    return []
  }
  
  return data as HandBillSummary[]
}

export async function getHandBillById(id: string): Promise<HandBill | null> {
  const { data, error } = await supabase
    .from('hand_bills')
    .select('*')
    .eq('id', id)
    .limit(1)

  if (error) {
    console.error('Error fetching hand bill:', error)
    return null
  }
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0] as HandBill
}

export async function getPendingHandBills(storeId?: string): Promise<HandBillSummary[]> {
  let query = supabase
    .from('hand_bills')
    .select('id, bill_date, bill_number, total_amount, tender_type, customer_name, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching pending hand bills:', error)
    return []
  }
  
  return data as HandBillSummary[]
}

export async function getHandBillsByStatus(status: HandBill['status'], storeId?: string): Promise<HandBillSummary[]> {
  let query = supabase
    .from('hand_bills')
    .select('id, bill_date, bill_number, total_amount, tender_type, customer_name, status, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error(`Error fetching ${status} hand bills:`, error)
    return []
  }
  
  return data as HandBillSummary[]
}

// Get hand bills for a date range with optional store filtering
export async function getHandBillsForDateRange(
  fromDate: string,
  toDate: string,
  storeIds?: string[] | null
) {
  let query = supabase
    .from('hand_bills')
    .select(`
      *,
      stores (
        store_name,
        store_code
      )
    `)
    .gte('bill_date', fromDate)
    .lte('bill_date', toDate)
    .order('created_at', { ascending: false })

  // If storeIds is provided and not null, filter by those stores
  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching hand bills for date range:', error)
    return []
  }
  
  return data as (HandBill & { stores: { store_name: string; store_code: string } })[]
}

export async function convertHandBillToSale(handBillId: string, saleId: string) {
  console.log('convertHandBillToSale called with:', { handBillId, saleId })
  
  // Follow the Stock_Audit pattern - just update, no select
  const { error } = await supabase
    .from('hand_bills')
    .update({
      status: 'converted',
      converted_sale_id: saleId
    })
    .eq('id', handBillId)

  if (error) {
    console.error('Supabase error during conversion:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    throw new Error(error.message)
  }
  
  console.log('Conversion successful - update completed')
  
  // Return a simple success object instead of fetching data
  return {
    id: handBillId,
    status: 'converted',
    converted_sale_id: saleId
  }
}

export async function updateHandBillStatus(id: string, status: HandBill['status'], notes?: string) {
  const updateData: any = { status }
  if (notes) updateData.notes = notes

  const { data, error } = await supabase
    .from('hand_bills')
    .update(updateData)
    .eq('id', id)
    .select()
    .limit(1)

  if (error) {
    console.error('Error updating hand bill status:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to update hand bill status - no data returned')
  }
  
  return data[0]
}

export async function updateHandBill(id: string, updates: Partial<HandBill>) {
  const { data, error } = await supabase
    .from('hand_bills')
    .update(updates)
    .eq('id', id)
    .select()
    .limit(1)

  if (error) {
    console.error('Error updating hand bill:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to update hand bill - no data returned')
  }
  
  return data[0]
}

export async function deleteHandBill(id: string) {
  const { error } = await supabase
    .from('hand_bills')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting hand bill:', error)
    throw new Error(error.message)
  }
}

export async function getHandBillsSummary(storeId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('hand_bills')
    .select('total_amount, tender_type, status, bill_date')
    .eq('store_id', storeId)
    .gte('bill_date', startDate)
    .lte('bill_date', endDate)

  if (error) {
    console.error('Error fetching hand bills summary:', error)
    return { 
      totalAmount: 0, 
      totalCount: 0, 
      byStatus: {},
      byTenderType: {},
      conversionRate: 0
    }
  }

  const totalAmount = data.reduce((sum, hb) => sum + hb.total_amount, 0)
  const totalCount = data.length

  const byStatus = data.reduce((acc: Record<string, { count: number; amount: number }>, hb) => {
    if (!acc[hb.status]) {
      acc[hb.status] = { count: 0, amount: 0 }
    }
    acc[hb.status].count += 1
    acc[hb.status].amount += hb.total_amount
    return acc
  }, {})

  const byTenderType = data.reduce((acc: Record<string, { count: number; amount: number }>, hb) => {
    if (!acc[hb.tender_type]) {
      acc[hb.tender_type] = { count: 0, amount: 0 }
    }
    acc[hb.tender_type].count += 1
    acc[hb.tender_type].amount += hb.total_amount
    return acc
  }, {})

  const convertedCount = byStatus.converted?.count || 0
  const conversionRate = totalCount > 0 ? (convertedCount / totalCount) * 100 : 0

  return {
    totalAmount,
    totalCount,
    byStatus,
    byTenderType,
    conversionRate
  }
}

export async function getRecentHandBills(limit: number = 50, storeId?: string): Promise<HandBillSummary[]> {
  let query = supabase
    .from('hand_bills')
    .select('id, bill_date, bill_number, total_amount, tender_type, customer_name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching recent hand bills:', error)
    return []
  }
  
  return data as HandBillSummary[]
}