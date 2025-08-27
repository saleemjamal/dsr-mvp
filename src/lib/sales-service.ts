import { supabase } from './supabase'

export interface Sale {
  id?: string
  store_id: string
  amount: number
  tender_type: string
  sale_date: string
  notes?: string
  created_by?: string
  created_at?: string
}

export interface Store {
  id: string
  store_code: string
  store_name: string
  is_active: boolean
}

// ==========================================
// STORES
// ==========================================

export async function getActiveStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('store_name')

  if (error) throw error
  return data as Store[]
}

// ==========================================
// SALES
// ==========================================

export async function createSale(sale: Omit<Sale, 'id' | 'created_at' | 'created_by'>) {
  const { data, error } = await supabase
    .from('sales')
    .insert([sale])
    .select()
    .limit(1)

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create sale - no data returned')
  }
  
  return data[0]
}

export async function updateSale(id: string, updates: Partial<Omit<Sale, 'id' | 'created_at' | 'created_by'>>) {
  const { data, error } = await supabase
    .from('sales')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .limit(1)

  if (error) throw error
  
  if (!data || data.length === 0) {
    throw new Error('Failed to update sale - no data returned')
  }
  
  return data[0]
}

export async function createMultipleSales(sales: Omit<Sale, 'id' | 'created_at' | 'created_by'>[]) {
  console.log('Attempting to insert sales:', sales)

  const { data, error } = await supabase
    .from('sales')
    .insert(sales)
    .select()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(error.message)
  }
  
  console.log('Sales created successfully:', data)
  return data
}

export async function getSalesForDate(storeId: string, date: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .eq('store_id', storeId)
    .eq('sale_date', date)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Sale[]
}

export async function getTodaysSales(storeId?: string) {
  const today = new Date().toISOString().split('T')[0]
  
  let query = supabase
    .from('sales')
    .select('*')
    .eq('sale_date', today)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Sale[]
}

// Get sales for a date range with optional store filtering
export async function getSalesForDateRange(
  fromDate: string, 
  toDate: string, 
  storeIds?: string[] | null
) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      stores (
        store_name,
        store_code
      )
    `)
    .gte('sale_date', fromDate)
    .lte('sale_date', toDate)
    .order('created_at', { ascending: false })

  // If storeIds is provided and not null, filter by those stores
  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query
  if (error) throw error
  return data as (Sale & { stores: { store_name: string; store_code: string } })[]
}

// Get sales filtered by user's accessible stores
export async function getSalesForUser(
  fromDate: string,
  toDate: string,
  userStoreIds: string[],
  isAllStoresSelected?: boolean
) {
  // If not "All Stores" selected, filter by specific stores
  const storeFilter = isAllStoresSelected ? null : userStoreIds
  return getSalesForDateRange(fromDate, toDate, storeFilter)
}

export async function getSalesSummaryByTenderType(storeId: string, date: string) {
  const { data, error } = await supabase
    .from('sales')
    .select('tender_type, amount')
    .eq('store_id', storeId)
    .eq('sale_date', date)

  if (error) throw error

  // Group by tender type and sum amounts
  const summary = data.reduce((acc: Record<string, number>, sale) => {
    if (!acc[sale.tender_type]) {
      acc[sale.tender_type] = 0
    }
    acc[sale.tender_type] += sale.amount
    return acc
  }, {})

  return summary
}