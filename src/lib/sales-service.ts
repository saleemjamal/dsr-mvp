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
  sale_type?: 'regular' | 'credit_bill'
  reference_type?: 'sales_order' | 'hand_bill' | null
  reference_id?: string
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

// ==========================================
// CREDIT BILLS
// ==========================================

export interface CreditBillConversion {
  soId: string
  finalAmount: number
  balancePaid: number
  balanceTenderType: string
  creditBillNumber: string
  varianceReason?: string
  notes?: string
  convertedBy: string
}

export interface CreditBillAudit {
  id: string
  sales_order_id: string
  sales_id: string
  store_id: string
  original_amount: number
  advance_paid: number
  final_amount: number
  balance_paid: number
  refund_amount: number
  amount_variance: number
  variance_percentage: number
  variance_type: 'increased' | 'decreased' | 'no_change'
  variance_reason?: string
  balance_tender_type: string
  credit_bill_number: string
  converted_by: string
  conversion_date: string
  notes?: string
}

// Create a credit bill from a sales order
export async function createCreditBillFromSO(conversion: CreditBillConversion) {
  const { data, error } = await supabase.rpc('convert_so_to_credit_bill', {
    p_so_id: conversion.soId,
    p_final_amount: conversion.finalAmount,
    p_balance_paid: conversion.balancePaid,
    p_balance_tender_type: conversion.balanceTenderType,
    p_credit_bill_number: conversion.creditBillNumber,
    p_variance_reason: conversion.varianceReason || null,
    p_notes: conversion.notes || null,
    p_converted_by: conversion.convertedBy
  })

  if (error) {
    console.error('Error creating credit bill:', error)
    throw new Error(`Failed to create credit bill: ${error.message}`)
  }

  return data
}

// Get credit bill audit trail
export async function getCreditBillAudit(soId?: string, storeId?: string) {
  let query = supabase
    .from('credit_bill_audit')
    .select(`
      *,
      sales_orders!inner(
        order_number,
        customer_name,
        customer_phone
      ),
      stores!inner(
        store_name,
        store_code
      ),
      user_profiles!inner(
        full_name
      )
    `)
    .order('conversion_date', { ascending: false })

  if (soId) {
    query = query.eq('sales_order_id', soId)
  }

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await supabase.from('credit_bills_summary').select('*')
  
  if (error) {
    console.error('Error fetching credit bill audit:', error)
    return []
  }

  return data || []
}

// Get credit bills for a date range
export async function getCreditBillsForDateRange(
  fromDate: string,
  toDate: string,
  storeIds?: string[] | null
) {
  let query = supabase
    .from('sales')
    .select(`
      *,
      stores:store_id(store_name, store_code)
    `)
    .eq('sale_type', 'credit_bill')
    .gte('sale_date', fromDate)
    .lte('sale_date', toDate)
    .order('created_at', { ascending: false })

  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching credit bills:', error)
    return []
  }

  return data || []
}

// Generate credit bill number
export async function generateCreditBillNumber(storeId: string): Promise<string> {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  
  // Get the latest credit bill for this store and month
  const { data } = await supabase
    .from('credit_bill_audit')
    .select('credit_bill_number')
    .eq('store_id', storeId)
    .like('credit_bill_number', `CB${year}${month}%`)
    .order('created_at', { ascending: false })

  let sequenceNumber = 1
  if (data && data.length > 0 && data[0].credit_bill_number) {
    const lastNumber = data[0].credit_bill_number
    const lastSequence = parseInt(lastNumber.slice(-3))
    if (!isNaN(lastSequence)) {
      sequenceNumber = lastSequence + 1
    }
  }

  return `CB${year}${month}${sequenceNumber.toString().padStart(3, '0')}`
}