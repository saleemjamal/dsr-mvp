import { supabase } from './supabase'

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  display_order: number
}

export interface Expense {
  id?: string
  store_id: string
  expense_date: string
  category: string
  amount: number
  description: string
  voucher_image_url?: string
  created_at?: string
  updated_at?: string
}

// ==========================================
// EXPENSE CATEGORIES
// ==========================================

export async function getActiveExpenseCategories() {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order')
    .order('name')

  if (error) throw error
  return data as ExpenseCategory[]
}

// ==========================================
// EXPENSES
// ==========================================

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expense])
    .select()
    .limit(1)

  if (error) {
    console.error('Error creating expense:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create expense - no data returned')
  }
  
  return data[0]
}

export async function createBatchExpenses(expenses: Omit<Expense, 'id' | 'created_at' | 'updated_at'>[]) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expenses)
    .select()

  if (error) {
    console.error('Error creating batch expenses:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create expenses - no data returned')
  }
  
  return data as Expense[]
}

export async function getExpensesForDate(storeId: string, date: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('store_id', storeId)
    .eq('expense_date', date)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Expense[]
}

export async function getTodaysExpenses(storeId?: string) {
  const today = new Date().toISOString().split('T')[0]
  
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('expense_date', today)
    .order('created_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Expense[]
}

// Get expenses for a date range with optional store filtering
export async function getExpensesForDateRange(
  fromDate: string,
  toDate: string,
  storeIds?: string[] | null
) {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      stores (
        store_name,
        store_code
      )
    `)
    .gte('expense_date', fromDate)
    .lte('expense_date', toDate)
    .order('created_at', { ascending: false })

  // If storeIds is provided and not null, filter by those stores
  if (storeIds && storeIds.length > 0) {
    query = query.in('store_id', storeIds)
  }

  const { data, error } = await query
  if (error) throw error
  return data as (Expense & { stores: { store_name: string; store_code: string } })[]
}

// Get expenses filtered by user's accessible stores
export async function getExpensesForUser(
  fromDate: string,
  toDate: string,
  userStoreIds: string[],
  isAllStoresSelected?: boolean
) {
  // If not "All Stores" selected, filter by specific stores
  const storeFilter = isAllStoresSelected ? null : userStoreIds
  return getExpensesForDateRange(fromDate, toDate, storeFilter)
}

export async function getExpenseSummaryByCategory(storeId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('store_id', storeId)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)

  if (error) throw error

  // Group by category and sum amounts
  const summary = data.reduce((acc: Record<string, number>, expense) => {
    if (!acc[expense.category]) {
      acc[expense.category] = 0
    }
    acc[expense.category] += expense.amount
    return acc
  }, {})

  return summary
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)

  if (error) throw error
  
  return {
    id,
    ...updates
  }
}

export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)

  if (error) throw error
}