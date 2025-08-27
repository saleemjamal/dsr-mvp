import { supabase } from './supabase'

export interface GiftVoucher {
  id?: string
  voucher_number: string
  amount: number
  balance: number
  status?: 'active' | 'redeemed' | 'cancelled' | 'expired'
  issued_date?: string
  expiry_date?: string
  customer_name?: string
  customer_phone?: string
  created_at?: string
  updated_at?: string
}

export interface GiftVoucherSummary {
  id: string
  voucher_number: string
  amount: number
  balance: number
  status: string
  issued_date: string
  expiry_date?: string
  customer_name?: string
  customer_phone?: string
  created_at: string
}

export interface VoucherTransaction {
  id?: string
  voucher_id: string
  transaction_type: 'redemption' | 'adjustment'
  amount: number
  reference?: string
  notes?: string
  created_at?: string
}

// ==========================================
// GIFT VOUCHER MANAGEMENT
// ==========================================

export async function createGiftVoucher(voucher: Omit<GiftVoucher, 'id' | 'created_at' | 'updated_at'>) {
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setFullYear(defaultExpiryDate.getFullYear() + 2) // 2 years validity

  const voucherData = {
    ...voucher,
    status: voucher.status || 'active',
    issued_date: voucher.issued_date || new Date().toISOString().split('T')[0],
    expiry_date: voucher.expiry_date || defaultExpiryDate.toISOString().split('T')[0],
    balance: voucher.balance || voucher.amount
  }

  const { data, error } = await supabase
    .from('gift_vouchers')
    .insert([voucherData])
    .select()
    .limit(1)

  if (error) {
    console.error('Error creating gift voucher:', error)
    throw new Error(error.message)
  }
  
  if (!data || data.length === 0) {
    throw new Error('Failed to create gift voucher - no data returned')
  }
  
  return data[0]
}

export async function getVoucherByNumber(voucherNumber: string): Promise<GiftVoucher | null> {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('*')
    .eq('voucher_number', voucherNumber.toUpperCase())
    .limit(1)

  if (error) {
    console.error('Error fetching voucher by number:', error)
    return null
  }
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0] as GiftVoucher
}

export async function getVoucherById(id: string): Promise<GiftVoucher | null> {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('*')
    .eq('id', id)
    .limit(1)

  if (error) {
    console.error('Error fetching voucher by ID:', error)
    return null
  }
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0] as GiftVoucher
}

export async function getTodaysVouchers(): Promise<GiftVoucherSummary[]> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('id, voucher_number, amount, balance, status, issued_date, customer_name, customer_phone, created_at')
    .eq('issued_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching today\'s vouchers:', error)
    return []
  }
  
  return data as GiftVoucherSummary[]
}

export async function getActiveVouchers(): Promise<GiftVoucherSummary[]> {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('id, voucher_number, amount, balance, status, issued_date, customer_name, customer_phone, created_at')
    .eq('status', 'active')
    .gt('balance', 0)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active vouchers:', error)
    return []
  }
  
  return data as GiftVoucherSummary[]
}

export async function searchVouchersByCustomer(customerName: string): Promise<GiftVoucherSummary[]> {
  if (!customerName || customerName.length < 2) return []

  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('id, voucher_number, amount, balance, status, issued_date, customer_name, customer_phone, created_at')
    .ilike('customer_name', `%${customerName}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching vouchers by customer:', error)
    return []
  }
  
  return data as GiftVoucherSummary[]
}

export async function searchVouchersByPhone(phone: string): Promise<GiftVoucherSummary[]> {
  if (!phone || phone.length < 3) return []

  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('id, voucher_number, amount, balance, status, issued_date, customer_name, customer_phone, created_at')
    .ilike('customer_phone', `%${phone}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching vouchers by phone:', error)
    return []
  }
  
  return data as GiftVoucherSummary[]
}

export async function redeemVoucher(voucherNumber: string, redeemAmount: number, reference?: string): Promise<GiftVoucher> {
  const voucher = await getVoucherByNumber(voucherNumber)
  
  if (!voucher) {
    throw new Error('Voucher not found')
  }

  if (voucher.status !== 'active') {
    throw new Error(`Voucher is ${voucher.status} and cannot be redeemed`)
  }

  if (voucher.balance < redeemAmount) {
    throw new Error('Insufficient voucher balance')
  }

  if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
    throw new Error('Voucher has expired')
  }

  const newBalance = voucher.balance - redeemAmount
  const newStatus = newBalance === 0 ? 'redeemed' : 'active'

  const { error } = await supabase
    .from('gift_vouchers')
    .update({
      balance: newBalance,
      status: newStatus
    })
    .eq('id', voucher.id)

  if (error) {
    console.error('Error redeeming voucher:', error)
    throw new Error(error.message)
  }

  return {
    ...voucher,
    balance: newBalance,
    status: newStatus
  } as GiftVoucher
}

export async function validateVoucherForRedemption(voucherNumber: string, amount: number) {
  const voucher = await getVoucherByNumber(voucherNumber)
  
  if (!voucher) {
    return { valid: false, message: 'Voucher not found' }
  }

  if (voucher.status !== 'active') {
    return { valid: false, message: `Voucher is ${voucher.status}` }
  }

  if (voucher.balance < amount) {
    return { 
      valid: false, 
      message: `Insufficient balance. Available: ₹${voucher.balance.toFixed(2)}` 
    }
  }

  if (voucher.expiry_date && new Date(voucher.expiry_date) < new Date()) {
    return { valid: false, message: 'Voucher has expired' }
  }

  return { 
    valid: true, 
    voucher,
    availableBalance: voucher.balance
  }
}

export async function cancelVoucher(id: string, reason?: string) {
  const { error } = await supabase
    .from('gift_vouchers')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (error) {
    console.error('Error cancelling voucher:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    status: 'cancelled'
  }
}

export async function updateVoucher(id: string, updates: Partial<GiftVoucher>) {
  const { error } = await supabase
    .from('gift_vouchers')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating voucher:', error)
    throw new Error(error.message)
  }
  
  return {
    id,
    ...updates
  }
}

export async function getVouchersSummary(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('amount, balance, status, issued_date')
    .gte('issued_date', startDate)
    .lte('issued_date', endDate)

  if (error) {
    console.error('Error fetching vouchers summary:', error)
    return {
      totalIssued: 0,
      totalAmount: 0,
      totalRedeemed: 0,
      totalBalance: 0,
      byStatus: {}
    }
  }

  const totalIssued = data.length
  const totalAmount = data.reduce((sum, v) => sum + v.amount, 0)
  const totalRedeemed = data.reduce((sum, v) => sum + (v.amount - v.balance), 0)
  const totalBalance = data.reduce((sum, v) => sum + v.balance, 0)

  const byStatus = data.reduce((acc: Record<string, number>, v) => {
    acc[v.status] = (acc[v.status] || 0) + 1
    return acc
  }, {})

  return {
    totalIssued,
    totalAmount,
    totalRedeemed,
    totalBalance,
    byStatus
  }
}

export async function getRecentVouchers(limit: number = 50): Promise<GiftVoucherSummary[]> {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('id, voucher_number, amount, balance, status, issued_date, customer_name, customer_phone, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent vouchers:', error)
    return []
  }
  
  return data as GiftVoucherSummary[]
}

// Get vouchers for a date range
export async function getVouchersForDateRange(
  fromDate: string,
  toDate: string
): Promise<GiftVoucherSummary[]> {
  const { data, error } = await supabase
    .from('gift_vouchers')
    .select('id, voucher_number, amount, balance, status, issued_date, expiry_date, customer_name, customer_phone, created_at')
    .gte('issued_date', fromDate)
    .lte('issued_date', toDate)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vouchers for date range:', error)
    return []
  }
  
  return data as GiftVoucherSummary[]
}

export async function markVouchersAsExpired() {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('gift_vouchers')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('expiry_date', today)
    .select()

  if (error) {
    console.error('Error marking vouchers as expired:', error)
    throw new Error(error.message)
  }
  
  return data
}