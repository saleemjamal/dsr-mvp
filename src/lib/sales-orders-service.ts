import { supabase } from './supabase'
import { Customer } from './customer-service'

export interface SalesOrder {
  id?: string
  store_id: string
  order_date: string
  order_number?: string
  customer_id?: string
  customer_name: string
  customer_phone?: string
  items_description: string
  total_amount: number
  advance_amount?: number
  balance_amount?: number
  balance_amount_paid?: number
  balance_tender_type?: string
  balance_payment_date?: string
  delivery_date?: string
  tender_type?: string
  status?: 'pending' | 'confirmed' | 'delivered' | 'cancelled' | 'reconciled'
  notes?: string
  converted_sale_id?: string
  created_at?: string
  updated_at?: string
}

export interface SalesOrderSummary {
  id?: string
  order_date: string
  order_number?: string
  customer_name: string
  customer_phone?: string
  total_amount: number
  advance_amount?: number
  balance_amount?: number
  balance_due?: number
  delivery_date?: string
  status?: string
  tender_type?: string
  items_count?: number
  created_at?: string
  updated_at?: string
  stores?: {
    store_name: string
    store_code: string
  }
}

export interface OrderStatusUpdate {
  status: SalesOrder['status']
  notes?: string
  delivery_date?: string
}

// ==========================================
// SALES ORDERS MANAGEMENT
// ==========================================

export async function createSalesOrder(order: Omit<SalesOrder, 'id' | 'created_at' | 'updated_at'>) {
  const orderData = {
    ...order,
    status: order.status || 'pending',
    advance_amount: order.advance_amount || 0,
    order_date: order.order_date || new Date().toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from('sales_orders')
    .insert([orderData])
    .select()

  if (error) {
    console.error('Error creating sales order:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create sales order - no data returned')
  }
  
  return data[0]
}

export async function getSalesOrdersForDate(storeId: string, date: string): Promise<SalesOrderSummary[]> {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .eq('store_id', storeId)
    .eq('order_date', date)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sales orders for date:', error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

export async function getTodaysSalesOrders(storeId?: string): Promise<SalesOrderSummary[]> {
  const today = new Date().toISOString().split('T')[0]
  
  let query = supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .eq('order_date', today)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching today\'s sales orders:', error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

export async function getSalesOrderById(id: string): Promise<SalesOrder | null> {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .eq('id', id)

    if (error) {
      console.error('Error fetching sales order:', error)
      return null
    }
    
    // Return first item if found, null otherwise
    return data && data.length > 0 ? data[0] as SalesOrder : null
  } catch (err) {
    console.error('Exception fetching sales order:', err)
    return null
  }
}

export async function getSalesOrdersByStatus(status: SalesOrder['status'], storeId?: string): Promise<SalesOrderSummary[]> {
  let query = supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error(`Error fetching ${status} sales orders:`, error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

// Get sales orders for a date range with optional store filtering
export async function getSalesOrdersForDateRange(
  fromDate: string,
  toDate: string,
  storeIds?: string[] | null
) {
  let query = supabase
    .from('sales_orders')
    .select(`
      *,
      stores (
        store_name,
        store_code
      )
    `)
    .gte('order_date', fromDate)
    .lte('order_date', toDate)
    .order('created_at', { ascending: false })

  // If storeIds is provided and not null, filter by those stores
  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching sales orders for date range:', error)
    return []
  }
  
  return data as (SalesOrder & { stores: { store_name: string; store_code: string } })[]
}

export async function getPendingSalesOrders(storeId?: string): Promise<SalesOrderSummary[]> {
  return getSalesOrdersByStatus('pending', storeId)
}

export async function getOrdersDueForDelivery(storeId?: string): Promise<SalesOrderSummary[]> {
  const today = new Date().toISOString().split('T')[0]
  
  let query = supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .in('status', ['pending', 'confirmed'])
    .lte('delivery_date', today)
    .order('delivery_date', { ascending: true })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching orders due for delivery:', error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

export async function searchOrdersByCustomer(customerName: string, storeId?: string): Promise<SalesOrderSummary[]> {
  if (!customerName || customerName.length < 2) return []

  let query = supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .ilike('customer_name', `%${customerName}%`)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error searching orders by customer:', error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

export async function searchOrdersByPhone(phone: string, storeId?: string): Promise<SalesOrderSummary[]> {
  if (!phone || phone.length < 3) return []

  let query = supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .ilike('customer_phone', `%${phone}%`)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error searching orders by phone:', error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

export async function updateSalesOrderStatus(id: string, statusUpdate: OrderStatusUpdate) {
  const updateData: any = { 
    status: statusUpdate.status,
    ...(statusUpdate.notes && { notes: statusUpdate.notes }),
    ...(statusUpdate.delivery_date && { delivery_date: statusUpdate.delivery_date })
  }

  const { error } = await supabase
    .from('sales_orders')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating sales order status:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updateData
  }
}

export async function updateAdvancePayment(id: string, advanceAmount: number, notes?: string) {
  const order = await getSalesOrderById(id)
  if (!order) throw new Error('Sales order not found')

  if (advanceAmount > order.total_amount) {
    throw new Error('Advance amount cannot exceed total amount')
  }

  const updateData: any = { 
    advance_amount: advanceAmount,
    ...(notes && { notes })
  }

  const { error } = await supabase
    .from('sales_orders')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating advance payment:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updateData
  }
}

export async function updateSalesOrder(id: string, updates: Partial<SalesOrder>) {
  const { error } = await supabase
    .from('sales_orders')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating sales order:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updates
  }
}

export async function deleteSalesOrder(id: string) {
  const { error } = await supabase
    .from('sales_orders')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting sales order:', error)
    throw new Error(error.message)
  }
}

export async function getSalesOrdersSummary(storeId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('sales_orders')
    .select('total_amount, advance_amount, status, order_date, delivery_date')
    .eq('store_id', storeId)
    .gte('order_date', startDate)
    .lte('order_date', endDate)

  if (error) {
    console.error('Error fetching sales orders summary:', error)
    return {
      totalOrders: 0,
      totalAmount: 0,
      totalAdvanceCollected: 0,
      totalBalanceAmount: 0,
      byStatus: {},
      fulfillmentRate: 0
    }
  }

  const totalOrders = data.length
  const totalAmount = data.reduce((sum, order) => sum + order.total_amount, 0)
  const totalAdvanceCollected = data.reduce((sum, order) => sum + (order.advance_amount || 0), 0)
  const totalBalanceAmount = totalAmount - totalAdvanceCollected

  const byStatus = data.reduce((acc: Record<string, { count: number; amount: number; advance: number }>, order) => {
    if (!acc[order.status]) {
      acc[order.status] = { count: 0, amount: 0, advance: 0 }
    }
    acc[order.status].count += 1
    acc[order.status].amount += order.total_amount
    acc[order.status].advance += order.advance_amount || 0
    return acc
  }, {})

  const deliveredCount = byStatus.delivered?.count || 0
  const fulfillmentRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0

  return {
    totalOrders,
    totalAmount,
    totalAdvanceCollected,
    totalBalanceAmount,
    byStatus,
    fulfillmentRate
  }
}

export async function getRecentSalesOrders(limit: number = 50, storeId?: string): Promise<SalesOrderSummary[]> {
  let query = supabase
    .from('sales_orders')
    .select('id, order_date, order_number, customer_name, customer_phone, total_amount, advance_amount, balance_amount, delivery_date, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching recent sales orders:', error)
    return []
  }
  
  return data as SalesOrderSummary[]
}

export async function generateOrderNumber(storeId: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  
  const { data, error } = await supabase
    .from('sales_orders')
    .select('order_number')
    .eq('store_id', storeId)
    .like('order_number', `SO${year}${month}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error generating order number:', error)
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `SO${year}${month}${randomNum}`
  }

  let sequenceNumber = 1
  if (data && data.length > 0 && data[0].order_number) {
    const lastOrderNumber = data[0].order_number
    const lastSequence = parseInt(lastOrderNumber.slice(-3))
    if (!isNaN(lastSequence)) {
      sequenceNumber = lastSequence + 1
    }
  }

  return `SO${year}${month}${sequenceNumber.toString().padStart(3, '0')}`
}

export async function convertSalesOrderToSale(
  salesOrderId: string, 
  saleId: string,
  balancePayment?: {
    amount: number
    tenderType: string
  }
) {
  console.log('convertSalesOrderToSale called with:', { salesOrderId, saleId, balancePayment })
  
  const updateData: any = {
    status: 'delivered',
    converted_sale_id: saleId
  }

  // If balance payment is provided, include it
  if (balancePayment && balancePayment.amount > 0) {
    updateData.balance_amount_paid = balancePayment.amount
    updateData.balance_tender_type = balancePayment.tenderType
    updateData.balance_payment_date = new Date().toISOString()
  }
  
  // Follow the Stock_Audit pattern - just update, no select
  const { error } = await supabase
    .from('sales_orders')
    .update(updateData)
    .eq('id', salesOrderId)

  if (error) {
    console.error('Error converting sales order to sale:', error)
    throw new Error(error.message)
  }
  
  console.log('Successfully converted sales order to sale')
  return {
    success: true,
    id: salesOrderId,
    converted_sale_id: saleId,
    balance_payment: balancePayment
  }
}