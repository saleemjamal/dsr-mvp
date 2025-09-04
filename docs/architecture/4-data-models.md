# 4. Data Models

## Existing Core Models
The DSR-MVP system maintains the following core entities:
- stores, sales, cash_movements, cash_balances, customers, expenses, gift_vouchers, hand_bills, returns, sales_orders

## GoFrugal Integration Models

### Sales Data Models

#### GoFrugalSale
Comprehensive sales transaction data synchronized from POS system.

```typescript
export interface GoFrugalSale {
  id: string;
  bill_id: string;                    // Unique POS transaction ID
  bill_number: string;                // Human-readable invoice number
  bill_date: string;                  // Transaction date (YYYY-MM-DD)
  bill_time: string;                  // Transaction time (HH:MM:SS)
  store_id: string;                   // Internal store reference
  store_code: string;                 // GoFrugal store identifier
  customer_id?: number;               // Customer reference
  customer_name?: string;
  customer_mobile?: string;
  gross_amount: number;               // Pre-tax, pre-discount total
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  round_off: number;
  bill_amount: number;                // Final transaction amount
  payment_mode: 'CASH' | 'CARD' | 'UPI' | 'MIXED';
  payment_details?: PaymentDetail[];  // Breakdown for mixed payments
  item_count: number;
  quantity: number;
  sales_man_id?: string;
  sales_man_name?: string;
  is_return: boolean;
  original_bill_number?: string;      // For return transactions
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING';
  pos_terminal?: string;
  raw_data: Record<string, any>;      // Complete API response
  sync_timestamp: string;
  sync_status: 'success' | 'failed' | 'pending' | 'partial';
  last_sync_timestamp?: string;       // For incremental sync
  created_at: string;
  updated_at: string;
}

export interface PaymentDetail {
  mode: 'CASH' | 'CARD' | 'UPI' | 'BANK';
  amount: number;
  card_type?: 'CREDIT' | 'DEBIT';
  card_last_four?: string;
  reference_number?: string;
}
```

### Inventory Models

#### GoFrugalItem
Product master data with comprehensive item information.

```typescript
export interface GoFrugalItem {
  id: string;
  item_id: string;                    // Unique item identifier
  item_code: string;                  // SKU/product code
  item_name: string;
  item_short_name?: string;
  category_id?: string;
  category_name?: string;
  brand_id?: string;
  brand_name?: string;
  manufacturer?: string;
  hsn_code?: string;                  // GST classification
  barcode?: string;
  uom: string;                         // Unit of measure
  pack_size: number;
  mrp: number;                         // Maximum retail price
  sale_price: number;
  purchase_price: number;
  tax_percentage: number;
  tax_type?: 'GST' | 'VAT';
  is_composite: boolean;
  is_service: boolean;
  allow_discount: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  item_timestamp?: string;             // For incremental sync
  raw_data: Record<string, any>;
  sync_timestamp: string;
  created_at: string;
  updated_at: string;
}
```

#### GoFrugalItemStock
Store-level inventory tracking with reorder management.

```typescript
export interface GoFrugalItemStock {
  id: string;
  item_id: string;                    // References GoFrugalItem
  store_id: string;                   // Internal store reference
  store_code: string;                 // GoFrugal store identifier
  current_stock: number;              // Total physical stock
  available_stock: number;            // Stock available for sale
  blocked_stock: number;              // Reserved/blocked quantity
  min_stock: number;                  // Minimum threshold
  max_stock: number;                  // Maximum limit
  reorder_level: number;              // Trigger for reorder
  last_stock_update?: string;
  sync_timestamp: string;
}
```

### Customer Models

#### GoFrugalCustomer
Comprehensive customer master with loyalty and credit management.

```typescript
export interface GoFrugalCustomer {
  id: string;
  customer_id: string;                // Unique customer code
  name: string;
  mobile: string;                     // Primary contact (unique)
  alternate_mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  date_of_birth?: string;
  anniversary?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  gst_number?: string;
  pan_number?: string;
  
  // Credit Management
  credit_limit: number;
  credit_days: number;
  outstanding_amount: number;
  
  // Loyalty Program
  loyalty_points: number;
  loyalty_tier?: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  tier_expiry_date?: string;
  
  // Analytics
  total_purchases: number;
  last_purchase_date?: string;
  visit_count: number;
  average_ticket_size: number;
  
  // Preferences
  preferred_store?: string;
  sales_man_id?: string;
  sales_man_name?: string;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'B2B';
  price_list?: string;
  discount_percentage: number;
  
  // Management
  notes?: string;
  tags?: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  blacklisted: boolean;
  last_sync_time?: string;
  raw_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### GoFrugalLoyaltyTransaction
Loyalty points earning and redemption history.

```typescript
export interface GoFrugalLoyaltyTransaction {
  id: string;
  transaction_id: string;
  customer_id: string;                // References GoFrugalCustomer
  transaction_date: string;
  transaction_type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'ADJUSTED';
  bill_number?: string;               // Associated sale transaction
  redemption_id?: string;             // For redemption records
  points: number;                     // Positive for earned, negative for redeemed
  description: string;
  store_id?: string;
  store_code?: string;
  balance_points: number;             // Running balance after transaction
  raw_data: Record<string, any>;
  sync_timestamp: string;
  created_at: string;
}
```

### Reconciliation Models

#### ReconciliationLog
Tracks variance between manual entries and API data.

```typescript
export interface ReconciliationLog {
  id: string;
  store_id: string;
  reconciliation_date: string;
  reconciliation_type: 'SALES' | 'INVENTORY' | 'CASH';
  
  // Two-way Comparison Only (Manual vs API)
  manual_total: number;
  api_total: number;
  variance_amount: number;            // Calculated difference
  variance_percentage: number;        // Percentage difference
  
  // Status Management (Simplified)
  status: 'matched' | 'variance' | 'resolved';
  
  // Resolution
  resolution_notes?: string;
  resolution_category?: 'data_entry' | 'timing' | 'system' | 'other';
  resolved_by?: string;
  resolved_at?: string;
  
  // Metadata
  matched_records?: number;
  unmatched_manual?: number;
  unmatched_api?: number;
  processing_time_ms?: number;
  created_at: string;
  updated_at: string;
}
```

#### VarianceAlert
Automated alerting for variance detection.

```typescript
export interface VarianceAlert {
  id: string;
  store_id: string;
  alert_date: string;
  alert_type: 'threshold_exceeded' | 'pattern_detected' | 'sync_failure' | 'consecutive_variance';
  
  // Alert Details
  variance_amount: number;
  threshold_amount: number;
  variance_percentage?: number;
  affected_entity?: 'sales' | 'inventory' | 'cash' | 'customer';
  affected_record_id?: string;
  
  // Alert Management
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_resolved: boolean;
  resolution_method?: 'auto' | 'manual' | 'system';
  
  // Notification
  notified_users?: string[];
  notification_channels?: ('email' | 'sms' | 'slack' | 'app')[];
  acknowledged_by?: string;
  acknowledged_at?: string;
  
  // Context
  context_data?: Record<string, any>;
  suggested_actions?: string[];
  created_at: string;
}
```

### Sync Management Models

#### SyncLog
Audit trail for all synchronization operations.

```typescript
export interface SyncLog {
  id: string;
  sync_id: string;                    // Unique sync operation identifier
  sync_type: 'sales' | 'items' | 'customers' | 'loyalty' | 'all';
  sync_mode: 'manual' | 'scheduled' | 'triggered';
  store_id?: string;                  // Optional for store-specific syncs
  
  // Sync Details
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  
  // Results
  status: 'running' | 'success' | 'partial' | 'failed';
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  
  // Rate Limiting
  api_calls_made: number;
  rate_limit_remaining?: number;
  rate_limit_reset_at?: string;
  
  // Error Tracking
  errors?: SyncError[];
  retry_count: number;
  next_retry_at?: string;
  
  // Metadata
  initiated_by?: string;              // User or system
  parameters?: Record<string, any>;   // Sync parameters used
  created_at: string;
}

export interface SyncError {
  timestamp: string;
  record_id?: string;
  error_code: string;
  error_message: string;
  stack_trace?: string;
}
```

#### FeatureFlag
Dynamic feature control for gradual rollout.

```typescript
export interface FeatureFlag {
  id: string;
  feature_name: string;
  feature_key: string;                // e.g., 'gofrugal_sync', 'variance_badges'
  enabled: boolean;
  
  // Rollout Configuration
  rollout_percentage: number;          // 0-100
  enabled_stores?: string[];           // Store-specific enablement
  enabled_users?: string[];            // User-specific enablement
  
  // Metadata
  description?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}
```

## Data Relationships

### Primary Relationships
1. **GoFrugalSale** → **GoFrugalCustomer**: Links sales to customer records
2. **GoFrugalItemStock** → **GoFrugalItem**: Inventory levels per item
3. **GoFrugalLoyaltyTransaction** → **GoFrugalCustomer**: Points history
4. **ReconciliationLog** → **Store**: Variance tracking per store
5. **SyncLog** → **Store**: Sync operations per store

### Data Flow
```
GoFrugal API → Sync Service → Database → Reconciliation Engine → Alerts
                    ↓              ↓              ↓                ↓
                SyncLog      Raw Tables    ReconciliationLog  VarianceAlert
```

## Data Retention Policy

| Data Type | Retention Period | Archive Strategy |
|-----------|-----------------|------------------|
| Sales Transactions | 3 years active, 7 years archive | Monthly partitions |
| Inventory Snapshots | 90 days | Daily aggregates only |
| Customer Data | Indefinite (with consent) | Annual review |
| Sync Logs | 30 days | Summary statistics only |
| Reconciliation Logs | 1 year | Quarterly archives |
| Variance Alerts | 6 months | Export to analytics |

## Performance Considerations

### Indexing Strategy
```sql
-- Critical indexes for query performance
CREATE INDEX idx_gofrugal_sales_date_store ON gofrugal_sales(bill_date, store_id);
CREATE INDEX idx_gofrugal_sales_sync ON gofrugal_sales(last_sync_timestamp);
CREATE INDEX idx_gofrugal_items_timestamp ON gofrugal_items(item_timestamp);
CREATE INDEX idx_reconciliation_variance ON reconciliation_logs(variance_amount) 
  WHERE status != 'matched';
CREATE INDEX idx_alerts_unack ON variance_alerts(created_at) 
  WHERE acknowledged_at IS NULL;
```

### Data Compression
- Enable JSONB compression for `raw_data` fields
- Use TOAST for large text fields
- Implement table partitioning for sales data by month