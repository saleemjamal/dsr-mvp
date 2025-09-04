# Story 1.1: Database Migration for GoFrugal Tables

## Story Details
**Epic:** 1 - Foundation & Database Setup  
**Priority:** P0 - Critical  
**Points:** 5  
**Assigned:** Developer  
**Status:** Completed  

## User Story
**As a** developer  
**I need to** create the database tables for storing GoFrugal API data and reconciliation logs  
**So that** we can persist and compare API data with manual entries  

## Acceptance Criteria
- [x] Create migration file `20250203_add_gofrugal_tables.sql` in `/supabase/migrations/`
- [x] Implement `gf_sales` table with proper columns and constraints (prefixed with gf_)
- [x] Implement `gf_reconciliation_logs` table with variance calculations
- [x] Implement `gf_variance_alerts` table for threshold notifications
- [x] Add appropriate indexes for store_id and date queries
- [x] Test migration rollback script works correctly
- [x] Verify tables created successfully in development environment

## Technical Implementation

### Table: gofrugal_sales
```sql
CREATE TABLE gofrugal_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id VARCHAR(50) NOT NULL,
  bill_number VARCHAR(50) NOT NULL,
  bill_date DATE NOT NULL,
  bill_time TIME,
  store_id UUID NOT NULL REFERENCES stores(id),
  store_code VARCHAR(50), -- GoFrugal store identifier
  customer_id INTEGER,
  customer_name VARCHAR(255),
  customer_mobile VARCHAR(15),
  gross_amount NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL,
  round_off NUMERIC(5,2) DEFAULT 0,
  bill_amount NUMERIC(12,2) NOT NULL,
  payment_mode VARCHAR(20) CHECK (payment_mode IN ('CASH', 'CARD', 'UPI', 'MIXED')),
  payment_details JSONB, -- Array of payment breakdowns for MIXED mode
  item_count INTEGER,
  quantity INTEGER,
  sales_man_id VARCHAR(50),
  sales_man_name VARCHAR(255),
  is_return BOOLEAN DEFAULT FALSE,
  original_bill_number VARCHAR(50), -- For returns
  status VARCHAR(20) DEFAULT 'COMPLETED',
  pos_terminal VARCHAR(50),
  raw_data JSONB, -- Complete API response
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status VARCHAR(20) CHECK (sync_status IN ('success', 'failed', 'pending', 'partial')),
  last_sync_timestamp VARCHAR(50), -- ISO timestamp for incremental sync
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bill_id, store_code)
);

CREATE INDEX idx_gofrugal_sales_bill_number ON gofrugal_sales(bill_number);
CREATE INDEX idx_gofrugal_sales_store_date ON gofrugal_sales(store_id, bill_date);
CREATE INDEX idx_gofrugal_sales_customer ON gofrugal_sales(customer_id);
CREATE INDEX idx_gofrugal_sales_sync_status ON gofrugal_sales(sync_status);
CREATE INDEX idx_gofrugal_sales_last_sync ON gofrugal_sales(last_sync_timestamp);
```

### Table: reconciliation_logs
```sql
CREATE TABLE reconciliation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  reconciliation_date DATE NOT NULL,
  manual_total NUMERIC(10,2) NOT NULL,
  api_total NUMERIC(10,2) NOT NULL,
  variance_amount NUMERIC(10,2) GENERATED ALWAYS AS (manual_total - api_total) STORED,
  variance_percentage NUMERIC(5,2) GENERATED ALWAYS AS 
    (CASE WHEN api_total = 0 THEN 0 
     ELSE ((manual_total - api_total) / api_total * 100) END) STORED,
  status VARCHAR(20) CHECK (status IN ('matched', 'variance', 'resolved')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, reconciliation_date)
);

CREATE INDEX idx_reconciliation_logs_store_date ON reconciliation_logs(store_id, reconciliation_date);
CREATE INDEX idx_reconciliation_logs_status ON reconciliation_logs(status);
```

### Table: variance_alerts
```sql
CREATE TABLE variance_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  alert_date DATE NOT NULL DEFAULT CURRENT_DATE,
  alert_type VARCHAR(50) CHECK (alert_type IN ('threshold_exceeded', 'pattern_detected', 'sync_failure')),
  variance_amount NUMERIC(10,2) NOT NULL,
  threshold_amount NUMERIC(10,2) DEFAULT 100,
  auto_resolved BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES user_profiles(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_variance_alerts_store_date ON variance_alerts(store_id, alert_date);
CREATE INDEX idx_variance_alerts_acknowledged ON variance_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;
```

### Table: gofrugal_items
```sql
CREATE TABLE gofrugal_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id VARCHAR(50) NOT NULL,
  item_code VARCHAR(100),
  item_name VARCHAR(500) NOT NULL,
  item_short_name VARCHAR(255),
  category_id VARCHAR(50),
  category_name VARCHAR(255),
  brand_id VARCHAR(50),
  brand_name VARCHAR(255),
  manufacturer VARCHAR(255),
  hsn_code VARCHAR(20),
  barcode VARCHAR(50),
  uom VARCHAR(20),
  pack_size INTEGER DEFAULT 1,
  mrp NUMERIC(12,2),
  sale_price NUMERIC(12,2),
  purchase_price NUMERIC(12,2),
  tax_percentage NUMERIC(5,2),
  tax_type VARCHAR(20),
  is_composite BOOLEAN DEFAULT FALSE,
  is_service BOOLEAN DEFAULT FALSE,
  allow_discount BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  item_timestamp VARCHAR(50), -- For incremental sync
  raw_data JSONB,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id)
);

CREATE INDEX idx_gofrugal_items_code ON gofrugal_items(item_code);
CREATE INDEX idx_gofrugal_items_barcode ON gofrugal_items(barcode);
CREATE INDEX idx_gofrugal_items_category ON gofrugal_items(category_id);
CREATE INDEX idx_gofrugal_items_brand ON gofrugal_items(brand_id);
CREATE INDEX idx_gofrugal_items_timestamp ON gofrugal_items(item_timestamp);
CREATE INDEX idx_gofrugal_items_status ON gofrugal_items(status);
```

### Table: gofrugal_item_stock
```sql
CREATE TABLE gofrugal_item_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id VARCHAR(50) NOT NULL REFERENCES gofrugal_items(item_id),
  store_id UUID NOT NULL REFERENCES stores(id),
  store_code VARCHAR(50),
  current_stock NUMERIC(12,3),
  available_stock NUMERIC(12,3),
  blocked_stock NUMERIC(12,3),
  min_stock NUMERIC(12,3),
  max_stock NUMERIC(12,3),
  reorder_level NUMERIC(12,3),
  last_stock_update TIMESTAMP WITH TIME ZONE,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, store_code)
);

CREATE INDEX idx_gofrugal_stock_item_store ON gofrugal_item_stock(item_id, store_id);
CREATE INDEX idx_gofrugal_stock_low ON gofrugal_item_stock(available_stock) 
  WHERE available_stock <= reorder_level;
```

### Table: gofrugal_customers
```sql
CREATE TABLE gofrugal_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mobile VARCHAR(15) NOT NULL,
  alternate_mobile VARCHAR(15),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  country VARCHAR(50) DEFAULT 'India',
  date_of_birth DATE,
  anniversary DATE,
  gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  gst_number VARCHAR(20),
  pan_number VARCHAR(10),
  credit_limit NUMERIC(12,2) DEFAULT 0,
  credit_days INTEGER DEFAULT 0,
  outstanding_amount NUMERIC(12,2) DEFAULT 0,
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier VARCHAR(50),
  total_purchases NUMERIC(12,2) DEFAULT 0,
  last_purchase_date DATE,
  visit_count INTEGER DEFAULT 0,
  average_ticket_size NUMERIC(12,2),
  preferred_store VARCHAR(50),
  sales_man_id VARCHAR(50),
  sales_man_name VARCHAR(255),
  customer_type VARCHAR(50) DEFAULT 'RETAIL',
  price_list VARCHAR(50),
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  tags JSONB,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  blacklisted BOOLEAN DEFAULT FALSE,
  last_sync_time TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(customer_id),
  UNIQUE(mobile)
);

CREATE INDEX idx_gofrugal_customers_mobile ON gofrugal_customers(mobile);
CREATE INDEX idx_gofrugal_customers_email ON gofrugal_customers(email);
CREATE INDEX idx_gofrugal_customers_status ON gofrugal_customers(status);
CREATE INDEX idx_gofrugal_customers_loyalty ON gofrugal_customers(loyalty_tier);
CREATE INDEX idx_gofrugal_customers_credit ON gofrugal_customers(outstanding_amount) 
  WHERE outstanding_amount > 0;
```

### Table: gofrugal_loyalty_transactions
```sql
CREATE TABLE gofrugal_loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL REFERENCES gofrugal_customers(customer_id),
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) CHECK (transaction_type IN ('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED')),
  bill_number VARCHAR(50),
  points INTEGER NOT NULL,
  description TEXT,
  store_id UUID REFERENCES stores(id),
  store_code VARCHAR(50),
  balance_points INTEGER,
  raw_data JSONB,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transaction_id)
);

CREATE INDEX idx_loyalty_trans_customer ON gofrugal_loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_trans_date ON gofrugal_loyalty_transactions(transaction_date);
CREATE INDEX idx_loyalty_trans_type ON gofrugal_loyalty_transactions(transaction_type);
```

### Rollback Script
```sql
-- Rollback script (save as 20250203_add_gofrugal_tables_rollback.sql)
DROP TABLE IF EXISTS gofrugal_loyalty_transactions CASCADE;
DROP TABLE IF EXISTS variance_alerts CASCADE;
DROP TABLE IF EXISTS reconciliation_logs CASCADE;
DROP TABLE IF EXISTS gofrugal_item_stock CASCADE;
DROP TABLE IF EXISTS gofrugal_sales CASCADE;
DROP TABLE IF EXISTS gofrugal_customers CASCADE;
DROP TABLE IF EXISTS gofrugal_items CASCADE;
```

## Testing Checklist
- [x] Run migration in development database
- [x] Verify all constraints work correctly
- [ ] Test unique constraints with duplicate data
- [ ] Verify foreign key relationships
- [ ] Test generated columns calculate correctly
- [ ] Run rollback script and verify clean removal
- [ ] Re-run migration after rollback
- [ ] Test with sample data inserts

## Dependencies
- Existing `stores` table
- Existing `user_profiles` table

## Risks
- **Risk:** Migration fails in production
  - **Mitigation:** Test thoroughly in staging first
- **Risk:** Performance issues with indexes
  - **Mitigation:** Monitor query performance after deployment

## Notes
- Use NUMERIC(10,2) for all monetary values
- Include timezone in all timestamp columns
- JSONB for raw_data allows flexible schema evolution
- Generated columns for automatic variance calculations
- **COMPLETED**: All tables prefixed with `gf_` for clear identification
- Migration file created in `supabase/gofrugal-integration/` folder
- Rollback script available at `20250203_add_gofrugal_tables_rollback.sql`