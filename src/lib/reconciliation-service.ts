import { supabase } from '@/lib/supabase'

export interface ReconciliationData {
  reconciled_by: string
  reconciled_at: string
  reconciliation_source?: 'bank' | 'erp' | 'cash' | 'voucher'
  reconciliation_notes?: string
  external_reference?: string
  status: 'reconciled' | 'completed'
}

export interface PendingTransaction {
  id: string
  type: 'sale' | 'expense' | 'return' | 'hand_bill' | 'gift_voucher' | 'sales_order'
  date: string
  amount: number
  description: string
  store_name: string
  tender_type?: string
  status: string
  created_at: string
  image_url?: string // For expenses (voucher_image_url) and hand bills (image_url)
}

// Get all pending transactions for reconciliation
export async function getPendingTransactionsForDate(
  date: string,
  storeIds?: string[]
): Promise<PendingTransaction[]> {
  try {
    const transactions: PendingTransaction[] = []
    
    // Helper to add store filter
    const addStoreFilter = (query: any) => {
      if (storeIds && storeIds.length > 0) {
        return query.in('store_id', storeIds)
      }
      return query
    }

    // Get pending sales
    let salesQuery = supabase
      .from('sales')
      .select(`
        id,
        sale_date,
        amount,
        tender_type,
        notes,
        status,
        created_at,
        stores!inner(store_name)
      `)
      .eq('sale_date', date)
      .eq('status', 'pending')
    
    salesQuery = addStoreFilter(salesQuery)
    const { data: sales } = await salesQuery

    if (sales) {
      transactions.push(...sales.map(sale => ({
        id: sale.id,
        type: 'sale' as const,
        date: sale.sale_date,
        amount: sale.amount,
        description: `Sale - ${sale.tender_type} - ${sale.notes || ''}`,
        store_name: sale.stores.store_name,
        tender_type: sale.tender_type,
        status: sale.status,
        created_at: sale.created_at
      })))
    }

    // Get pending expenses
    let expensesQuery = supabase
      .from('expenses')
      .select(`
        id,
        expense_date,
        amount,
        category,
        description,
        voucher_image_url,
        status,
        created_at,
        stores!inner(store_name)
      `)
      .eq('expense_date', date)
      .eq('status', 'pending')
    
    expensesQuery = addStoreFilter(expensesQuery)
    const { data: expenses } = await expensesQuery

    if (expenses) {
      transactions.push(...expenses.map(expense => ({
        id: expense.id,
        type: 'expense' as const,
        date: expense.expense_date,
        amount: expense.amount,
        description: `${expense.category} - ${expense.description}`,
        store_name: expense.stores.store_name,
        status: expense.status,
        created_at: expense.created_at,
        image_url: expense.voucher_image_url
      })))
    }

    // Get pending returns
    let returnsQuery = supabase
      .from('returns')
      .select(`
        id,
        return_date,
        return_amount,
        reason,
        original_bill_reference,
        status,
        created_at,
        stores!inner(store_name)
      `)
      .eq('return_date', date)
      .eq('status', 'pending')
    
    returnsQuery = addStoreFilter(returnsQuery)
    const { data: returns } = await returnsQuery

    if (returns) {
      transactions.push(...returns.map(returnItem => ({
        id: returnItem.id,
        type: 'return' as const,
        date: returnItem.return_date,
        amount: returnItem.return_amount,
        description: `Return - ${returnItem.original_bill_reference} - ${returnItem.reason || ''}`,
        store_name: returnItem.stores.store_name,
        status: returnItem.status,
        created_at: returnItem.created_at
      })))
    }

    // Get pending hand bills
    let handBillsQuery = supabase
      .from('hand_bills')
      .select(`
        id,
        bill_date,
        total_amount,
        bill_number,
        tender_type,
        image_url,
        status,
        created_at,
        stores!inner(store_name)
      `)
      .eq('bill_date', date)
      .eq('status', 'pending')
    
    handBillsQuery = addStoreFilter(handBillsQuery)
    const { data: handBills } = await handBillsQuery

    if (handBills) {
      transactions.push(...handBills.map(bill => ({
        id: bill.id,
        type: 'hand_bill' as const,
        date: bill.bill_date,
        amount: bill.total_amount,
        description: `Hand Bill - ${bill.bill_number}`,
        store_name: bill.stores.store_name,
        tender_type: bill.tender_type,
        status: bill.status,
        created_at: bill.created_at,
        image_url: bill.image_url
      })))
    }

    // Get active gift vouchers (created on the date that haven't been reconciled)
    console.log('Querying gift vouchers for date:', date)
    
    const { data: vouchers, error: voucherError } = await supabase
      .from('gift_vouchers')
      .select(`
        id,
        issued_date,
        amount,
        voucher_number,
        tender_type,
        status,
        created_at,
        reconciled_at
      `)
      .eq('issued_date', date)
      .eq('status', 'active')
      .is('reconciled_at', null)

    if (voucherError) {
      console.error('Gift vouchers query error:', voucherError)
    } else {
      console.log('Gift vouchers found:', vouchers?.length || 0)
    }

    if (vouchers) {
      transactions.push(...vouchers.map(voucher => ({
        id: voucher.id,
        type: 'gift_voucher' as const,
        date: voucher.issued_date,
        amount: voucher.amount,
        description: `Gift Voucher - ${voucher.voucher_number}`,
        store_name: 'All Stores', // Vouchers are not store-specific
        tender_type: voucher.tender_type,
        status: voucher.status,
        created_at: voucher.created_at
      })))
    }

    // Sort by created_at
    return transactions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  } catch (error) {
    console.error('Error fetching pending transactions:', error)
    throw error
  }
}

// Reconcile a single transaction
export async function reconcileTransaction(
  transactionId: string,
  transactionType: string,
  reconciliationData: ReconciliationData
): Promise<void> {
  try {
    const tableName = getTableName(transactionType)
    
    console.log('Reconciling transaction:', { transactionId, transactionType, tableName })
    
    if (!transactionId) {
      throw new Error('Transaction ID is required')
    }

    const { error } = await supabase
      .from(tableName)
      .update({
        status: reconciliationData.status,
        reconciled_by: reconciliationData.reconciled_by,
        reconciled_at: reconciliationData.reconciled_at,
        reconciliation_source: reconciliationData.reconciliation_source,
        reconciliation_notes: reconciliationData.reconciliation_notes,
        external_reference: reconciliationData.external_reference
      })
      .eq('id', transactionId)

    console.log('Reconciliation completed for:', transactionId)

    if (error) {
      console.error('Reconciliation error:', error)
      throw error
    }
  } catch (error) {
    console.error('Error reconciling transaction:', error)
    throw error
  }
}

// Reconcile multiple transactions at once
export async function reconcileMultipleTransactions(
  transactions: Array<{
    id: string
    type: string
    reconciliationData: ReconciliationData
  }>
): Promise<void> {
  try {
    // Group by transaction type for batch updates
    const transactionsByType = transactions.reduce((acc, transaction) => {
      const type = transaction.type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(transaction)
      return acc
    }, {} as Record<string, Array<{ id: string; reconciliationData: ReconciliationData }>>)

    // Process each type in parallel
    const promises = Object.entries(transactionsByType).map(([type, typeTransactions]) => {
      const tableName = getTableName(type)
      
      return Promise.all(
        typeTransactions.map(({ id, reconciliationData }) =>
          supabase
            .from(tableName)
            .update({
              status: reconciliationData.status,
              reconciled_by: reconciliationData.reconciled_by,
              reconciled_at: reconciliationData.reconciled_at,
              reconciliation_source: reconciliationData.reconciliation_source,
              reconciliation_notes: reconciliationData.reconciliation_notes,
              external_reference: reconciliationData.external_reference
            })
            .eq('id', id)
        )
      )
    })

    await Promise.all(promises)
  } catch (error) {
    console.error('Error reconciling multiple transactions:', error)
    throw error
  }
}

// Get reconciliation summary for a date range
export async function getReconciliationSummary(
  fromDate: string,
  toDate: string,
  storeIds?: string[]
): Promise<{
  totalTransactions: number
  reconciledTransactions: number
  pendingTransactions: number
  byType: Record<string, { total: number; reconciled: number; pending: number }>
}> {
  try {
    const summary = {
      totalTransactions: 0,
      reconciledTransactions: 0,
      pendingTransactions: 0,
      byType: {} as Record<string, { total: number; reconciled: number; pending: number }>
    }

    const transactionTypes = [
      { type: 'sales', dateField: 'sale_date' },
      { type: 'expenses', dateField: 'expense_date' },
      { type: 'returns', dateField: 'return_date' },
      { type: 'hand_bills', dateField: 'bill_date' }
    ]

    for (const { type, dateField } of transactionTypes) {
      let query = supabase
        .from(type)
        .select('status', { count: 'exact', head: true })
        .gte(dateField, fromDate)
        .lte(dateField, toDate)

      if (storeIds && storeIds.length > 0) {
        query = query.in('store_id', storeIds)
      }

      const { count: total } = await query
      
      // Get reconciled count
      let reconciledQuery = supabase
        .from(type)
        .select('status', { count: 'exact', head: true })
        .gte(dateField, fromDate)
        .lte(dateField, toDate)
        .in('status', ['reconciled', 'completed'])

      if (storeIds && storeIds.length > 0) {
        reconciledQuery = reconciledQuery.in('store_id', storeIds)
      }

      const { count: reconciled } = await reconciledQuery
      
      const pending = (total || 0) - (reconciled || 0)
      
      summary.byType[type] = {
        total: total || 0,
        reconciled: reconciled || 0,
        pending
      }
      
      summary.totalTransactions += total || 0
      summary.reconciledTransactions += reconciled || 0
      summary.pendingTransactions += pending
    }

    return summary
  } catch (error) {
    console.error('Error getting reconciliation summary:', error)
    throw error
  }
}

function getTableName(transactionType: string): string {
  const tableMap = {
    sale: 'sales',
    expense: 'expenses',
    return: 'returns',
    hand_bill: 'hand_bills',
    gift_voucher: 'gift_vouchers',
    sales_order: 'sales_orders'
  } as const

  return tableMap[transactionType as keyof typeof tableMap] || transactionType
}

// Check if user can edit transaction based on status
export function canEditTransaction(status: string, userRole: string): boolean {
  // Only pending transactions can be edited by store users
  if (status === 'pending') return true
  
  // AIC can update reconciliation status
  if (userRole === 'accounts_incharge' && status === 'reconciled') return true
  
  return false
}