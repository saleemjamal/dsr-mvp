// GoFrugal API Integration Service
// Handles all API interactions with GoFrugal POS system

import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ==========================================
// TYPES AND INTERFACES
// ==========================================

export interface GoFrugalSale {
  id?: string
  bill_id: string
  bill_number: string
  bill_date: string
  bill_time?: string
  store_id: string
  store_code?: string
  customer_id?: number
  customer_name?: string
  customer_mobile?: string
  gross_amount: number
  discount_amount?: number
  tax_amount?: number
  net_amount: number
  round_off?: number
  bill_amount: number
  payment_mode?: 'CASH' | 'CARD' | 'UPI' | 'MIXED'
  payment_details?: Record<string, any>
  item_count?: number
  quantity?: number
  sales_man_id?: string
  sales_man_name?: string
  is_return?: boolean
  original_bill_number?: string
  status?: string
  pos_terminal?: string
  raw_data?: Record<string, any>
  sync_timestamp?: string
  sync_status?: 'success' | 'failed' | 'pending' | 'partial'
  last_sync_timestamp?: string
}

export interface SyncResult {
  success: boolean
  records_created: number
  records_failed: number
  duration_ms: number
  errors?: string[]
  sync_id: string
}

export interface ValidationResult {
  matched: boolean
  manual_total: number
  api_total: number
  variance_amount: number
  variance_percentage: number
  requires_explanation: boolean
  suggested_action: 'accept' | 'review' | 'investigate'
}

export interface GoFrugalConfig {
  licenseKey: string
  baseUrl: string
  hqPath: string
  maxRetries: number
  timeout: number
  rateLimit: {
    requestsPerHour: number
    requestsPerMinute: number
  }
}

export interface GoFrugalItem {
  item_id: string
  item_code?: string
  item_name: string
  item_short_name?: string
  category_id?: string
  category_name?: string
  brand_id?: string
  brand_name?: string
  manufacturer?: string
  hsn_code?: string
  barcode?: string
  uom?: string
  pack_size?: number
  mrp?: number
  sale_price?: number
  purchase_price?: number
  tax_percentage?: number
  tax_type?: string
  is_composite?: boolean
  is_service?: boolean
  allow_discount?: boolean
  status?: string
  item_timestamp?: string
  raw_data?: Record<string, any>
}

export interface GoFrugalCustomer {
  customer_id: string
  name: string
  mobile: string
  alternate_mobile?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
  date_of_birth?: string
  anniversary?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  gst_number?: string
  pan_number?: string
  credit_limit?: number
  credit_days?: number
  outstanding_amount?: number
  loyalty_points?: number
  loyalty_tier?: string
  total_purchases?: number
  last_purchase_date?: string
  visit_count?: number
  average_ticket_size?: number
  preferred_store?: string
  sales_man_id?: string
  sales_man_name?: string
  customer_type?: string
  price_list?: string
  discount_percentage?: number
  notes?: string
  tags?: Record<string, any>
  status?: string
  blacklisted?: boolean
  last_sync_time?: string
  raw_data?: Record<string, any>
}

// ==========================================
// CIRCUIT BREAKER IMPLEMENTATION
// ==========================================

class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: Date | null = null
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private readonly threshold = 5
  private readonly timeout = 60000 // 1 minute

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.timeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is OPEN - API calls disabled')
      }
    }

    try {
      const result = await fn()
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
      }
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    }
  }

  private recordFailure() {
    this.failures++
    this.lastFailureTime = new Date()
    if (this.failures >= this.threshold) {
      this.state = 'open'
      console.error(`Circuit breaker OPENED after ${this.failures} failures`)
    }
  }

  public reset() {
    this.failures = 0
    this.lastFailureTime = null
    this.state = 'closed'
  }

  public getState() {
    return this.state
  }
}

// ==========================================
// MAIN SERVICE CLASS
// ==========================================

export class GoFrugalService {
  private config: GoFrugalConfig
  private circuitBreaker: CircuitBreaker

  constructor(config?: Partial<GoFrugalConfig>) {
    this.config = {
      licenseKey: process.env.GOFRUGAL_LICENSE_KEY || '',
      baseUrl: process.env.GOFRUGAL_BASE_URL || 'http://hq.example.com',
      hqPath: process.env.GOFRUGAL_HQ_PATH || '/RayMedi_HQ',
      maxRetries: 3,
      timeout: 30000,
      rateLimit: {
        requestsPerHour: 1000,
        requestsPerMinute: 50
      },
      ...config
    }
    this.circuitBreaker = new CircuitBreaker()
  }

  // ==========================================
  // SALES SYNC METHODS
  // ==========================================

  public async syncSales(storeId: string, date?: Date): Promise<SyncResult> {
    const startTime = Date.now()
    const syncId = crypto.randomUUID()
    const errors: string[] = []
    let recordsCreated = 0
    let recordsFailed = 0

    try {
      // Use circuit breaker for API call
      const apiData = await this.circuitBreaker.execute(() => 
        this.fetchSalesFromAPI(storeId, date)
      )

      // Process and store each record
      for (const record of apiData) {
        try {
          const transformed = this.transformSalesData(record, storeId)
          await this.storeSaleRecord(transformed)
          recordsCreated++
        } catch (error: any) {
          console.error('Failed to process record:', error)
          errors.push(`Record ${record.billId}: ${error.message}`)
          recordsFailed++
        }
      }

      // Create reconciliation log entry
      await this.createReconciliationLog(storeId, date || new Date(), recordsCreated)

      return {
        success: recordsFailed === 0,
        records_created: recordsCreated,
        records_failed: recordsFailed,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
        sync_id: syncId
      }
    } catch (error: any) {
      console.error('Sync failed:', error)
      return {
        success: false,
        records_created: 0,
        records_failed: 0,
        duration_ms: Date.now() - startTime,
        errors: [error.message],
        sync_id: syncId
      }
    }
  }

  private async fetchSalesFromAPI(storeId: string, date?: Date, page: number = 1): Promise<any[]> {
    const endpoint = `${this.config.baseUrl}${this.config.hqPath}/api/v1/salesHeader`
    const targetDate = date || new Date()
    const dateString = targetDate.toISOString().split('T')[0]
    
    const params = new URLSearchParams({
      storeId: storeId,
      fromDate: dateString,
      toDate: dateString,
      page: page.toString(),
      limit: '100'
    })

    // Add incremental sync if we have a last sync timestamp
    const lastSync = await this.getLastSyncTimestamp(storeId)
    if (lastSync) {
      params.append('lastSyncTimestamp', lastSync)
    }

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'GET',
      headers: {
        'X-Auth-Token': this.config.licenseKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(this.config.timeout)
    })

    if (!response.ok) {
      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-RateLimit-Reset')
        throw new Error(`Rate limited. Retry after: ${retryAfter}`)
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Handle pagination if needed
    const allRecords = data.salesHeader || data.records || data.data || []
    
    // Check if there are more pages
    if (data.pagination?.has_next && page < 10) { // Limit to 10 pages for safety
      const nextPageData = await this.fetchSalesFromAPI(storeId, date, page + 1)
      return [...allRecords, ...nextPageData]
    }

    return allRecords
  }

  private transformSalesData(rawData: any, storeId: string): GoFrugalSale {
    return {
      bill_id: rawData.billId || rawData.id,
      bill_number: rawData.billNumber || rawData.billNo,
      bill_date: rawData.billDate || rawData.date,
      bill_time: rawData.billTime || rawData.time,
      store_id: storeId,
      store_code: rawData.storeId || rawData.storeCode,
      customer_id: rawData.customerId ? parseInt(rawData.customerId) : undefined,
      customer_name: rawData.customerName,
      customer_mobile: rawData.customerMobile || rawData.mobile,
      gross_amount: parseFloat(rawData.grossAmount || rawData.subTotal || 0),
      discount_amount: parseFloat(rawData.discountAmount || rawData.discount || 0),
      tax_amount: parseFloat(rawData.taxAmount || rawData.tax || 0),
      net_amount: parseFloat(rawData.netAmount || rawData.total || 0),
      round_off: parseFloat(rawData.roundOff || 0),
      bill_amount: parseFloat(rawData.billAmount || rawData.finalAmount || 0),
      payment_mode: this.mapPaymentMode(rawData.paymentMode || rawData.paymentType),
      payment_details: rawData.paymentDetails || rawData.payments,
      item_count: parseInt(rawData.itemCount || rawData.noOfItems || 0),
      quantity: parseInt(rawData.quantity || rawData.totalQty || 0),
      sales_man_id: rawData.salesManId || rawData.salesPersonId,
      sales_man_name: rawData.salesManName || rawData.salesPersonName,
      is_return: rawData.isReturn || rawData.returnFlag || false,
      original_bill_number: rawData.originalBillNumber || rawData.refBillNo,
      status: rawData.status || 'COMPLETED',
      pos_terminal: rawData.posTerminal || rawData.terminalId,
      raw_data: rawData,
      sync_status: 'success',
      last_sync_timestamp: new Date().toISOString()
    }
  }

  private mapPaymentMode(mode: string): 'CASH' | 'CARD' | 'UPI' | 'MIXED' | undefined {
    if (!mode) return undefined
    const upperMode = mode.toUpperCase()
    if (upperMode.includes('CASH')) return 'CASH'
    if (upperMode.includes('CARD') || upperMode.includes('CREDIT') || upperMode.includes('DEBIT')) return 'CARD'
    if (upperMode.includes('UPI')) return 'UPI'
    if (upperMode.includes('MIXED') || upperMode.includes('MULTIPLE')) return 'MIXED'
    return undefined
  }

  private async storeSaleRecord(sale: GoFrugalSale): Promise<void> {
    const { error } = await supabase
      .from('gf_sales')
      .upsert(sale, {
        onConflict: 'bill_id,store_code'
      })

    if (error) throw error
  }

  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  public async validateAgainstAPI(
    manualTotal: number, 
    storeId: string, 
    date: Date
  ): Promise<ValidationResult> {
    try {
      // Fetch API data for comparison
      const { data: apiData, error } = await supabase
        .from('gf_sales')
        .select('bill_amount')
        .eq('store_id', storeId)
        .eq('bill_date', date.toISOString().split('T')[0])

      if (error) throw error

      // Calculate API total
      const apiTotal = apiData?.reduce((sum, sale) => sum + (sale.bill_amount || 0), 0) || 0
      const varianceAmount = manualTotal - apiTotal
      const variancePercentage = apiTotal === 0 ? 0 : (varianceAmount / apiTotal) * 100
      const threshold = 100 // ₹100 threshold

      return {
        matched: Math.abs(varianceAmount) <= threshold,
        manual_total: manualTotal,
        api_total: apiTotal,
        variance_amount: varianceAmount,
        variance_percentage: variancePercentage,
        requires_explanation: Math.abs(varianceAmount) > threshold,
        suggested_action: this.getSuggestedAction(varianceAmount, threshold)
      }
    } catch (error: any) {
      console.error('Validation failed:', error)
      throw error
    }
  }

  private getSuggestedAction(variance: number, threshold: number): 'accept' | 'review' | 'investigate' {
    const absVariance = Math.abs(variance)
    if (absVariance <= threshold) return 'accept'
    if (absVariance <= threshold * 5) return 'review'
    return 'investigate'
  }

  private async createReconciliationLog(storeId: string, date: Date, recordCount: number): Promise<void> {
    const dateString = date.toISOString().split('T')[0]
    
    // Get manual total from DSR sales table
    const { data: manualData } = await supabase
      .from('sales')
      .select('amount')
      .eq('store_id', storeId)
      .eq('sale_date', dateString)

    const manualTotal = manualData?.reduce((sum, sale) => sum + (sale.amount || 0), 0) || 0

    // Get API total from GoFrugal sales
    const { data: apiData } = await supabase
      .from('gf_sales')
      .select('bill_amount')
      .eq('store_id', storeId)
      .eq('bill_date', dateString)

    const apiTotal = apiData?.reduce((sum, sale) => sum + (sale.bill_amount || 0), 0) || 0

    // Create or update reconciliation log
    const { error } = await supabase
      .from('gf_reconciliation_logs')
      .upsert({
        store_id: storeId,
        reconciliation_date: dateString,
        manual_total: manualTotal,
        api_total: apiTotal,
        status: Math.abs(manualTotal - apiTotal) <= 100 ? 'matched' : 'variance'
      }, {
        onConflict: 'store_id,reconciliation_date'
      })

    if (error) {
      console.error('Failed to create reconciliation log:', error)
    }

    // Create variance alert if needed
    const variance = manualTotal - apiTotal
    if (Math.abs(variance) > 100) {
      await supabase
        .from('gf_variance_alerts')
        .insert({
          store_id: storeId,
          alert_date: dateString,
          alert_type: 'threshold_exceeded',
          variance_amount: variance,
          threshold_amount: 100
        })
    }
  }

  // ==========================================
  // ITEMS SYNC METHODS
  // ==========================================

  public async syncItems(storeId?: string): Promise<SyncResult> {
    const startTime = Date.now()
    const syncId = crypto.randomUUID()
    const errors: string[] = []
    let recordsCreated = 0
    let recordsFailed = 0

    try {
      const endpoint = `${this.config.baseUrl}${this.config.hqPath}/api/v1/items`
      
      // Get last item sync timestamp
      const lastSync = await this.getLastItemSyncTimestamp()
      
      let page = 1
      let hasMore = true

      while (hasMore && page <= 10) {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '100',
          selectAll: 'true'
        })

        if (lastSync) {
          params.append('itemTimeStamp', lastSync)
        }

        const response = await this.circuitBreaker.execute(() =>
          fetch(`${endpoint}?${params}`, {
            headers: {
              'X-Auth-Token': this.config.licenseKey,
              'Content-Type': 'application/json',
              'Accept-Encoding': 'gzip'
            },
            signal: AbortSignal.timeout(this.config.timeout)
          })
        )

        if (!response.ok) {
          throw new Error(`Items sync failed: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const items = data.items || data.data || []
        
        // Process items
        for (const item of items) {
          try {
            await this.storeItemRecord(item, storeId)
            recordsCreated++
          } catch (error: any) {
            console.error('Failed to process item:', error)
            errors.push(`Item ${item.itemId}: ${error.message}`)
            recordsFailed++
          }
        }

        hasMore = data.pagination?.has_next || false
        page++
      }

      return {
        success: recordsFailed === 0,
        records_created: recordsCreated,
        records_failed: recordsFailed,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
        sync_id: syncId
      }
    } catch (error: any) {
      console.error('Items sync failed:', error)
      return {
        success: false,
        records_created: recordsCreated,
        records_failed: recordsFailed,
        duration_ms: Date.now() - startTime,
        errors: [error.message],
        sync_id: syncId
      }
    }
  }

  private async storeItemRecord(item: any, storeId?: string): Promise<void> {
    const transformedItem: GoFrugalItem = {
      item_id: item.itemId || item.id,
      item_code: item.itemCode || item.code,
      item_name: item.itemName || item.name,
      item_short_name: item.itemShortName || item.shortName,
      category_id: item.categoryId,
      category_name: item.categoryName || item.category,
      brand_id: item.brandId,
      brand_name: item.brandName || item.brand,
      manufacturer: item.manufacturer,
      hsn_code: item.hsnCode || item.hsn,
      barcode: item.barcode,
      uom: item.uom || item.unit,
      pack_size: item.packSize ? parseInt(item.packSize) : 1,
      mrp: item.mrp ? parseFloat(item.mrp) : undefined,
      sale_price: item.salePrice ? parseFloat(item.salePrice) : undefined,
      purchase_price: item.purchasePrice ? parseFloat(item.purchasePrice) : undefined,
      tax_percentage: item.taxPercentage ? parseFloat(item.taxPercentage) : undefined,
      tax_type: item.taxType,
      is_composite: item.isComposite || false,
      is_service: item.isService || false,
      allow_discount: item.allowDiscount !== false,
      status: item.status || 'ACTIVE',
      item_timestamp: item.itemTimeStamp || item.timestamp,
      raw_data: item
    }

    const { error } = await supabase
      .from('gf_items')
      .upsert(transformedItem, {
        onConflict: 'item_id'
      })

    if (error) throw error

    // Store stock information if available
    if (item.stock && storeId) {
      const stockData = Array.isArray(item.stock) ? item.stock : [item.stock]
      
      for (const stock of stockData) {
        await supabase
          .from('gf_item_stock')
          .upsert({
            item_id: item.itemId || item.id,
            store_id: storeId,
            store_code: stock.storeId || stock.storeCode,
            current_stock: stock.currentStock ? parseFloat(stock.currentStock) : 0,
            available_stock: stock.availableStock ? parseFloat(stock.availableStock) : 0,
            blocked_stock: stock.blockedStock ? parseFloat(stock.blockedStock) : 0,
            min_stock: stock.minStock ? parseFloat(stock.minStock) : 0,
            max_stock: stock.maxStock ? parseFloat(stock.maxStock) : 0,
            reorder_level: stock.reorderLevel ? parseFloat(stock.reorderLevel) : 0,
            last_stock_update: stock.lastStockUpdate || new Date().toISOString()
          }, {
            onConflict: 'item_id,store_code'
          })
      }
    }
  }

  // ==========================================
  // CUSTOMERS SYNC METHODS
  // ==========================================

  public async syncCustomers(page: number = 1, limit: number = 50): Promise<SyncResult> {
    const startTime = Date.now()
    const syncId = crypto.randomUUID()
    let recordsCreated = 0
    let recordsFailed = 0
    const errors: string[] = []
    
    try {
      const endpoint = `${this.config.baseUrl}${this.config.hqPath}/api/v1/eCustomers`
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        q: 'status==ACTIVE'
      })

      const response = await this.circuitBreaker.execute(() =>
        fetch(`${endpoint}?${params}`, {
          headers: {
            'X-Auth-Token': this.config.licenseKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(this.config.timeout)
        })
      )

      if (!response.ok) {
        throw new Error(`Customer sync failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const customers = data.eCustomers || data.customers || data.data || []
      
      // Store customer data
      for (const customer of customers) {
        try {
          await this.storeCustomerRecord(customer)
          recordsCreated++
        } catch (error: any) {
          console.error('Failed to process customer:', error)
          errors.push(`Customer ${customer.customerId || customer.id}: ${error.message}`)
          recordsFailed++
        }
      }

      return {
        success: recordsFailed === 0,
        records_created: recordsCreated,
        records_failed: recordsFailed,
        duration_ms: Date.now() - startTime,
        errors: errors.length > 0 ? errors : undefined,
        sync_id: syncId
      }
    } catch (error: any) {
      console.error('Customer sync failed:', error)
      return {
        success: false,
        records_created: recordsCreated,
        records_failed: recordsFailed,
        duration_ms: Date.now() - startTime,
        errors: [error.message],
        sync_id: syncId
      }
    }
  }

  private async storeCustomerRecord(customer: any): Promise<void> {
    const transformedCustomer: GoFrugalCustomer = {
      customer_id: customer.customerId || customer.id,
      name: customer.name || customer.customerName,
      mobile: customer.mobile || customer.mobileNumber,
      alternate_mobile: customer.alternateMobile || customer.altMobile,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode || customer.zipCode,
      country: customer.country || 'India',
      date_of_birth: customer.dateOfBirth || customer.dob,
      anniversary: customer.anniversary,
      gender: this.mapGender(customer.gender),
      gst_number: customer.gstNumber || customer.gstin,
      pan_number: customer.panNumber || customer.pan,
      credit_limit: customer.creditLimit ? parseFloat(customer.creditLimit) : 0,
      credit_days: customer.creditDays ? parseInt(customer.creditDays) : 0,
      outstanding_amount: customer.outstandingAmount ? parseFloat(customer.outstandingAmount) : 0,
      loyalty_points: customer.loyaltyPoints ? parseInt(customer.loyaltyPoints) : 0,
      loyalty_tier: customer.loyaltyTier || customer.tier,
      total_purchases: customer.totalPurchases ? parseFloat(customer.totalPurchases) : 0,
      last_purchase_date: customer.lastPurchaseDate,
      visit_count: customer.visitCount ? parseInt(customer.visitCount) : 0,
      average_ticket_size: customer.averageTicketSize ? parseFloat(customer.averageTicketSize) : undefined,
      preferred_store: customer.preferredStore,
      sales_man_id: customer.salesManId,
      sales_man_name: customer.salesManName,
      customer_type: customer.customerType || 'RETAIL',
      price_list: customer.priceList,
      discount_percentage: customer.discountPercentage ? parseFloat(customer.discountPercentage) : 0,
      notes: customer.notes,
      tags: customer.tags,
      status: customer.status || 'ACTIVE',
      blacklisted: customer.blacklisted || false,
      last_sync_time: new Date().toISOString(),
      raw_data: customer
    }

    const { error } = await supabase
      .from('gf_customers')
      .upsert(transformedCustomer, {
        onConflict: 'customer_id'
      })

    if (error) throw error
  }

  private mapGender(gender: string | undefined): 'MALE' | 'FEMALE' | 'OTHER' | undefined {
    if (!gender) return undefined
    const upperGender = gender.toUpperCase()
    if (upperGender === 'M' || upperGender === 'MALE') return 'MALE'
    if (upperGender === 'F' || upperGender === 'FEMALE') return 'FEMALE'
    return 'OTHER'
  }

  // ==========================================
  // LOYALTY SYNC METHODS
  // ==========================================

  public async syncLoyaltyInfo(customerId: string, fromDate?: Date, toDate?: Date): Promise<any> {
    const endpoint = `${this.config.baseUrl}${this.config.hqPath}/api/v1/loyaltyInfo`
    const params = new URLSearchParams({
      customerId: customerId
    })

    if (fromDate) params.append('fromDate', fromDate.toISOString().split('T')[0])
    if (toDate) params.append('toDate', toDate.toISOString().split('T')[0])

    const response = await fetch(`${endpoint}?${params}`, {
      headers: {
        'X-Auth-Token': this.config.licenseKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(this.config.timeout)
    })

    if (!response.ok) {
      throw new Error(`Loyalty sync failed: ${response.status}`)
    }

    const data = await response.json()
    
    // Store loyalty transactions
    if (data.transactions) {
      for (const transaction of data.transactions) {
        await this.storeLoyaltyTransaction(transaction, customerId)
      }
    }

    return data
  }

  private async storeLoyaltyTransaction(transaction: any, customerId: string): Promise<void> {
    const { error } = await supabase
      .from('gf_loyalty_transactions')
      .upsert({
        transaction_id: transaction.transactionId || transaction.id,
        customer_id: customerId,
        transaction_date: transaction.transactionDate || transaction.date,
        transaction_type: this.mapTransactionType(transaction.transactionType || transaction.type),
        bill_number: transaction.billNumber,
        points: parseInt(transaction.points || 0),
        description: transaction.description,
        store_code: transaction.storeCode,
        balance_points: transaction.balancePoints ? parseInt(transaction.balancePoints) : undefined,
        raw_data: transaction
      }, {
        onConflict: 'transaction_id'
      })

    if (error) {
      console.error('Failed to store loyalty transaction:', error)
    }
  }

  private mapTransactionType(type: string): 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED' {
    const upperType = type.toUpperCase()
    if (upperType.includes('EARN')) return 'EARNED'
    if (upperType.includes('REDEEM')) return 'REDEEMED'
    if (upperType.includes('EXPIRE')) return 'EXPIRED'
    return 'ADJUSTED'
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async getLastSyncTimestamp(storeId: string): Promise<string | null> {
    const { data } = await supabase
      .from('gf_sales')
      .select('last_sync_timestamp')
      .eq('store_id', storeId)
      .order('last_sync_timestamp', { ascending: false })
      .limit(1)

    return data?.[0]?.last_sync_timestamp || null
  }

  private async getLastItemSyncTimestamp(): Promise<string | null> {
    const { data } = await supabase
      .from('gf_items')
      .select('item_timestamp')
      .order('item_timestamp', { ascending: false })
      .limit(1)

    return data?.[0]?.item_timestamp || null
  }

  // Public method to get circuit breaker state
  public getCircuitBreakerState(): string {
    return this.circuitBreaker.getState()
  }

  // Public method to reset circuit breaker
  public resetCircuitBreaker(): void {
    this.circuitBreaker.reset()
  }
}

// Export singleton instance
export const gofrugalService = new GoFrugalService()