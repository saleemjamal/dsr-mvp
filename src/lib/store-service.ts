import { supabase } from './supabase'

export interface Store {
  id: string
  store_code: string
  store_name: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreStats {
  total_users: number
  active_users: number
  super_users: number
  managers: number
  cashiers: number
}

export interface StoreWithStats extends Store {
  stats?: StoreStats
}

// ==========================================
// STORE MANAGEMENT
// ==========================================

export async function createStore(store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) {
  // Check if store code already exists
  const existing = await getStoreByCode(store.store_code)
  if (existing) {
    throw new Error(`Store with code '${store.store_code}' already exists`)
  }

  const { data, error } = await supabase
    .from('stores')
    .insert([{
      ...store,
      is_active: store.is_active ?? true
    }])
    .select()

  if (error) {
    console.error('Error creating store:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create store - no data returned')
  }
  
  return data[0] as Store
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .limit(1)

  if (error) {
    console.error('Error fetching store by ID:', error)
    return null
  }
  
  return data && data.length > 0 ? data[0] as Store : null
}

export async function getStoreByCode(storeCode: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('store_code', storeCode)
    .limit(1)

  if (error) {
    console.error('Error fetching store:', error)
    return null
  }
  
  return data && data.length > 0 ? data[0] as Store : null
}

export async function getMainStore(): Promise<Store | null> {
  return getStoreByCode('MAIN')
}

export async function getAllStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('store_name')

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }
  
  return data as Store[]
}

export async function updateStore(id: string, updates: Partial<Omit<Store, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('stores')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating store:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updates
  } as Store
}

export async function deleteStore(id: string) {
  // Check if store has any users assigned
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('default_store_id', id)
    .limit(1)

  if (users && users.length > 0) {
    throw new Error('Cannot delete store with assigned users. Please reassign users first.')
  }

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting store:', error)
    throw new Error(error.message)
  }
}

export async function toggleStoreStatus(id: string): Promise<Store> {
  // Get current status
  const { data: storeData } = await supabase
    .from('stores')
    .select('is_active')
    .eq('id', id)
    .limit(1)

  if (!storeData || storeData.length === 0) {
    throw new Error('Store not found')
  }
  
  const store = storeData[0]
  return updateStore(id, { is_active: !store.is_active })
}

export async function getStoreStats(storeId: string): Promise<StoreStats> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('default_store_id', storeId)

  if (error) {
    console.error('Error fetching store stats:', error)
    return {
      total_users: 0,
      active_users: 0,
      super_users: 0,
      managers: 0,
      cashiers: 0
    }
  }

  const stats = data.reduce((acc, user) => {
    acc.total_users++
    if (user.is_active) acc.active_users++
    
    switch (user.role) {
      case 'super_user':
        acc.super_users++
        break
      case 'store_manager':
        acc.managers++
        break
      case 'cashier':
        acc.cashiers++
        break
    }
    
    return acc
  }, {
    total_users: 0,
    active_users: 0,
    super_users: 0,
    managers: 0,
    cashiers: 0
  })

  return stats
}

export async function getStoresWithStats(): Promise<StoreWithStats[]> {
  const stores = await getAllStores()
  
  const storesWithStats = await Promise.all(
    stores.map(async (store) => ({
      ...store,
      stats: await getStoreStats(store.id)
    }))
  )
  
  return storesWithStats
}

export async function getAllStoresWithStats(): Promise<StoreWithStats[]> {
  // For admin - get ALL stores including inactive ones
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('store_name')

  if (error) {
    console.error('Error fetching all stores:', error)
    return []
  }

  const stores = data as Store[]
  
  const storesWithStats = await Promise.all(
    stores.map(async (store) => ({
      ...store,
      stats: await getStoreStats(store.id)
    }))
  )
  
  return storesWithStats
}

export async function getUserAccessibleStores(userId: string): Promise<Store[]> {
  // Get user profile to check role - only active users should have access
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('role, default_store_id, is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .limit(1)

  if (!profileData || profileData.length === 0) {
    return []
  }
  
  const profile = profileData[0]

  // Super users and accounts incharge can access all stores
  if (profile.role === 'super_user' || profile.role === 'accounts_incharge') {
    return getAllStores()
  }

  // Store managers and cashiers are limited to their assigned store
  if (profile.default_store_id) {
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('id', profile.default_store_id)
      .eq('is_active', true)
      .limit(1)

    if (!storeData || storeData.length === 0) {
      return []
    }
    
    return [storeData[0] as Store]
  }

  return []
}

export async function assignUsersToStore(storeId: string, userIds: string[]) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ default_store_id: storeId })
    .in('id', userIds)

  if (error) {
    console.error('Error assigning users to store:', error)
    throw new Error(error.message)
  }
}

export async function getStoreUsers(storeId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, is_active, created_at')
    .eq('default_store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching store users:', error)
    throw new Error(error.message)
  }

  return data
}

export async function ensureMainStoreExists(): Promise<Store> {
  let store = await getMainStore()
  
  if (!store) {
    store = await createStore({
      store_code: 'MAIN',
      store_name: 'Main Store',
      address: '123 Business Street, City',
      phone: '+91 9876543210',
      email: 'main@store.com',
      is_active: true
    })
  }
  
  return store
}

export async function validateStoreCode(storeCode: string): Promise<boolean> {
  // Store codes should be uppercase alphanumeric, 3-10 characters
  const regex = /^[A-Z0-9]{3,10}$/
  return regex.test(storeCode)
}