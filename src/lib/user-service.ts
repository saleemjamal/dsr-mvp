import { supabase } from './supabase'
import { Store } from './store-service'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role: 'super_user' | 'accounts_incharge' | 'store_manager' | 'cashier'
  default_store_id?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface UserStoreAccess {
  id: string
  user_id: string
  store_id: string
  can_view: boolean
  can_edit: boolean
  can_approve: boolean
  granted_at?: string
  granted_by?: string
  store?: Store
}

export interface UserSession {
  id?: string
  user_id: string
  store_id?: string
  session_start?: string
  session_end?: string
  last_activity?: string
  ip_address?: string
  user_agent?: string
  is_active?: boolean
}

// ==========================================
// USER PROFILE MANAGEMENT
// ==========================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  console.log('Fetching user profile for userId:', userId)
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)

  console.log('getUserProfile query result:', { data, error })

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  if (!data || data.length === 0) {
    console.log('No user profile found for userId:', userId)
    return null
  }
  
  console.log('User profile data:', data[0])
  return data[0] as UserProfile
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)

  if (error) {
    console.error('Error updating user profile:', error)
    throw new Error(error.message)
  }
  
  return {
    id: userId,
    ...updates
  } as UserProfile
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }
  
  return data as UserProfile[]
}

export async function deactivateUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) {
    console.error('Error deactivating user:', error)
    throw new Error(error.message)
  }
}

// ==========================================
// USER STORE ACCESS MANAGEMENT
// ==========================================

export async function getUserStoreAccess(userId: string): Promise<UserStoreAccess[]> {
  const { data, error } = await supabase
    .from('user_store_access')
    .select(`
      *,
      store:stores(*)
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching user store access:', error)
    return []
  }
  
  return data as UserStoreAccess[]
}

export async function grantStoreAccess(
  userId: string, 
  storeId: string, 
  permissions: {
    can_view?: boolean
    can_edit?: boolean
    can_approve?: boolean
  },
  grantedBy?: string
): Promise<UserStoreAccess> {
  const { data, error } = await supabase
    .from('user_store_access')
    .upsert([{
      user_id: userId,
      store_id: storeId,
      can_view: permissions.can_view ?? true,
      can_edit: permissions.can_edit ?? false,
      can_approve: permissions.can_approve ?? false,
      granted_by: grantedBy
    }])
    .select()

  if (error) {
    console.error('Error granting store access:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to grant store access - no data returned')
  }
  
  return data[0] as UserStoreAccess
}

export async function revokeStoreAccess(userId: string, storeId: string): Promise<void> {
  const { error } = await supabase
    .from('user_store_access')
    .delete()
    .eq('user_id', userId)
    .eq('store_id', storeId)

  if (error) {
    console.error('Error revoking store access:', error)
    throw new Error(error.message)
  }
}

export async function hasStoreAccess(userId: string, storeId: string, permission: 'view' | 'edit' | 'approve' = 'view'): Promise<boolean> {
  const { data: accessData, error } = await supabase
    .from('user_store_access')
    .select('can_view, can_edit, can_approve')
    .eq('user_id', userId)
    .eq('store_id', storeId)

  if (error || !accessData || accessData.length === 0) {
    return false
  }
  
  const data = accessData[0]

  switch (permission) {
    case 'view':
      return data.can_view
    case 'edit':
      return data.can_edit
    case 'approve':
      return data.can_approve
    default:
      return false
  }
}

// ==========================================
// USER SESSION MANAGEMENT
// ==========================================

export async function createUserSession(session: Omit<UserSession, 'id' | 'session_start' | 'last_activity' | 'is_active'>): Promise<UserSession> {
  const { data, error } = await supabase
    .from('user_sessions')
    .insert([{
      ...session,
      is_active: true
    }])
    .select()

  if (error) {
    console.error('Error creating user session:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create user session - no data returned')
  }
  
  return data[0] as UserSession
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_sessions')
    .update({ last_activity: new Date().toISOString() })
    .eq('id', sessionId)

  if (error) {
    console.error('Error updating session activity:', error)
  }
}

export async function endUserSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_sessions')
    .update({ 
      session_end: new Date().toISOString(),
      is_active: false
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error ending user session:', error)
  }
}

export async function getUserActiveSessions(userId: string): Promise<UserSession[]> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_activity', { ascending: false })

  if (error) {
    console.error('Error fetching user sessions:', error)
    return []
  }
  
  return data as UserSession[]
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }
  
  return getUserProfile(user.id)
}

export async function getCurrentUserStores(): Promise<Store[]> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }
  
  const access = await getUserStoreAccess(user.id)
  return access.map(a => a.store).filter(Boolean) as Store[]
}

export function isSuperUser(profile: UserProfile): boolean {
  return profile.role === 'super_user'
}

export function isAccountsIncharge(profile: UserProfile): boolean {
  return profile.role === 'accounts_incharge'
}

export function isStoreManager(profile: UserProfile): boolean {
  return profile.role === 'store_manager'
}

export function isCashier(profile: UserProfile): boolean {
  return profile.role === 'cashier'
}

export function hasMultiStoreAccess(profile: UserProfile): boolean {
  return profile.role === 'super_user' || profile.role === 'accounts_incharge'
}

export function canAccessStore(profile: UserProfile, storeId: string): boolean {
  // Super User and Accounts Incharge can access all stores
  if (hasMultiStoreAccess(profile)) {
    return true
  }
  
  // Store Manager and Cashier are limited to their assigned store
  return profile.default_store_id === storeId
}