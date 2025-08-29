import { supabase } from './supabase'
import { ensureMainStoreExists } from './store-service'
import { getCurrentUser } from './user-service'

export interface Customer {
  id?: string
  customer_name: string
  phone?: string
  email?: string
  address?: string
  origin_store_id?: string
  credit_limit?: number
  outstanding_balance?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface CustomerSearchResult {
  id: string
  customer_name: string
  phone?: string
  email?: string
  address?: string
  outstanding_balance: number
  is_active: boolean
}

// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  // Get the store ID - try user's default store first, then main store
  let storeId = customer.origin_store_id
  
  if (!storeId) {
    const currentUser = await getCurrentUser()
    storeId = currentUser?.default_store_id
  }
  
  if (!storeId) {
    const mainStore = await ensureMainStoreExists()
    storeId = mainStore.id
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([{
      ...customer,
      origin_store_id: storeId,
      is_active: true,
      credit_limit: customer.credit_limit || 0,
      outstanding_balance: customer.outstanding_balance || 0
    }])
    .select()

  if (error) {
    console.error('Error creating customer:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create customer - no data returned')
  }
  
  return data[0]
}

export async function searchCustomersByPhone(phone: string): Promise<CustomerSearchResult[]> {
  console.log('searchCustomersByPhone called with phone:', phone)
  if (!phone || phone.length < 3) {
    console.log('Phone too short, returning empty array')
    return []
  }

  console.log('Making Supabase query for phone:', phone)
  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_name, phone, email, address, outstanding_balance, is_active')
    .eq('is_active', true)
    .ilike('phone', `%${phone}%`)
    .limit(10)

  if (error) {
    console.error('Error searching customers by phone:', error)
    throw new Error(`Database error: ${error.message}`)
  }
  
  console.log('Phone search returned:', data?.length || 0, 'results')
  return data as CustomerSearchResult[]
}

export async function searchCustomersByName(name: string): Promise<CustomerSearchResult[]> {
  console.log('searchCustomersByName called with name:', name)
  if (!name || name.length < 2) {
    console.log('Name too short, returning empty array')
    return []
  }

  console.log('Making Supabase query for name:', name)
  const { data, error } = await supabase
    .from('customers')
    .select('id, customer_name, phone, email, address, outstanding_balance, is_active')
    .eq('is_active', true)
    .ilike('customer_name', `%${name}%`)
    .limit(10)

  if (error) {
    console.error('Error searching customers by name:', error)
    throw new Error(`Database error: ${error.message}`)
  }
  
  console.log('Name search returned:', data?.length || 0, 'results')
  return data as CustomerSearchResult[]
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)

  if (error) {
    console.error('Error fetching customer:', error)
    return null
  }
  
  return data && data.length > 0 ? data[0] as Customer : null
}

export async function updateCustomer(id: string, updates: Partial<Customer>) {
  const { error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating customer:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updates
  }
}

export async function updateCustomerBalance(id: string, amount: number, operation: 'add' | 'subtract' = 'add') {
  const customer = await getCustomerById(id)
  if (!customer) throw new Error('Customer not found')

  const currentBalance = customer.outstanding_balance || 0
  const newBalance = operation === 'add' 
    ? currentBalance + amount 
    : Math.max(0, currentBalance - amount)

  return updateCustomer(id, { outstanding_balance: newBalance })
}

export async function getAllCustomers(storeId?: string): Promise<Customer[]> {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('customer_name')

  if (storeId) {
    query = query.eq('origin_store_id', storeId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching customers:', error)
    return []
  }
  
  return data as Customer[]
}

export async function deactivateCustomer(id: string) {
  const { error } = await supabase
    .from('customers')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deactivating customer:', error)
    throw new Error(error.message)
  }
}

// Helper function for customer lookup component
export async function searchCustomers(query: string): Promise<CustomerSearchResult[]> {
  console.log('searchCustomers called with query:', query)
  const phoneRegex = /^\d+$/
  
  if (phoneRegex.test(query)) {
    console.log('Searching by phone:', query)
    return await searchCustomersByPhone(query)
  } else {
    console.log('Searching by name:', query)
    return await searchCustomersByName(query)
  }
}