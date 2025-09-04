-- Migration: Add GoFrugal Integration Tables
-- Purpose: Create tables for storing GoFrugal API data and reconciliation logs
-- Date: 2025-02-03
-- Author: DSR Development Team

-- ==========================================
-- TABLE: gf_sales
-- Purpose: Store sales data from GoFrugal API
-- ==========================================
CREATE TABLE gf_sales (
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

-- Indexes for gf_sales
CREATE INDEX idx_gf_sales_bill_number ON gf_sales(bill_number);
CREATE INDEX idx_gf_sales_store_date ON gf_sales(store_id, bill_date);
CREATE INDEX idx_gf_sales_customer ON gf_sales(customer_id);
CREATE INDEX idx_gf_sales_sync_status ON gf_sales(sync_status);
CREATE INDEX idx_gf_sales_last_sync ON gf_sales(last_sync_timestamp);

-- ==========================================
-- TABLE: gf_reconciliation_logs
-- Purpose: Track reconciliation between manual and API data
-- ==========================================
CREATE TABLE gf_reconciliation_logs (
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

-- Indexes for gf_reconciliation_logs
CREATE INDEX idx_gf_reconciliation_logs_store_date ON gf_reconciliation_logs(store_id, reconciliation_date);
CREATE INDEX idx_gf_reconciliation_logs_status ON gf_reconciliation_logs(status);

-- ==========================================
-- TABLE: gf_variance_alerts
-- Purpose: Store alerts when variances exceed thresholds
-- ==========================================
CREATE TABLE gf_variance_alerts (
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

-- Indexes for gf_variance_alerts
CREATE INDEX idx_gf_variance_alerts_store_date ON gf_variance_alerts(store_id, alert_date);
CREATE INDEX idx_gf_variance_alerts_acknowledged ON gf_variance_alerts(acknowledged_at) WHERE acknowledged_at IS NULL;

-- ==========================================
-- TABLE: gf_items
-- Purpose: Store item/product master data from GoFrugal
-- ==========================================
CREATE TABLE gf_items (
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

-- Indexes for gf_items
CREATE INDEX idx_gf_items_code ON gf_items(item_code);
CREATE INDEX idx_gf_items_barcode ON gf_items(barcode);
CREATE INDEX idx_gf_items_category ON gf_items(category_id);
CREATE INDEX idx_gf_items_brand ON gf_items(brand_id);
CREATE INDEX idx_gf_items_timestamp ON gf_items(item_timestamp);
CREATE INDEX idx_gf_items_status ON gf_items(status);

-- ==========================================
-- TABLE: gf_item_stock
-- Purpose: Store item stock levels by store
-- ==========================================
CREATE TABLE gf_item_stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id VARCHAR(50) NOT NULL REFERENCES gf_items(item_id),
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

-- Indexes for gf_item_stock
CREATE INDEX idx_gf_stock_item_store ON gf_item_stock(item_id, store_id);
CREATE INDEX idx_gf_stock_low ON gf_item_stock(available_stock) 
  WHERE available_stock <= reorder_level;

-- ==========================================
-- TABLE: gf_customers
-- Purpose: Store customer master data from GoFrugal
-- ==========================================
CREATE TABLE gf_customers (
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

-- Indexes for gf_customers
CREATE INDEX idx_gf_customers_mobile ON gf_customers(mobile);
CREATE INDEX idx_gf_customers_email ON gf_customers(email);
CREATE INDEX idx_gf_customers_status ON gf_customers(status);
CREATE INDEX idx_gf_customers_loyalty ON gf_customers(loyalty_tier);
CREATE INDEX idx_gf_customers_credit ON gf_customers(outstanding_amount) 
  WHERE outstanding_amount > 0;

-- ==========================================
-- TABLE: gf_loyalty_transactions
-- Purpose: Store customer loyalty point transactions
-- ==========================================
CREATE TABLE gf_loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL REFERENCES gf_customers(customer_id),
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

-- Indexes for gf_loyalty_transactions
CREATE INDEX idx_gf_loyalty_trans_customer ON gf_loyalty_transactions(customer_id);
CREATE INDEX idx_gf_loyalty_trans_date ON gf_loyalty_transactions(transaction_date);
CREATE INDEX idx_gf_loyalty_trans_type ON gf_loyalty_transactions(transaction_type);

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON TABLE gf_sales IS 'Sales transactions fetched from GoFrugal API for reconciliation';
COMMENT ON TABLE gf_reconciliation_logs IS 'Daily reconciliation logs between manual entries and API data';
COMMENT ON TABLE gf_variance_alerts IS 'Alerts generated when variances exceed defined thresholds';
COMMENT ON TABLE gf_items IS 'Product master data from GoFrugal POS system';
COMMENT ON TABLE gf_item_stock IS 'Current stock levels by item and store';
COMMENT ON TABLE gf_customers IS 'Customer master data from GoFrugal including loyalty information';
COMMENT ON TABLE gf_loyalty_transactions IS 'Customer loyalty point transactions history';

-- ==========================================
-- GRANT PERMISSIONS (adjust based on your roles)
-- ==========================================
-- Grant SELECT to all authenticated users
GRANT SELECT ON gf_sales TO authenticated;
GRANT SELECT ON gf_reconciliation_logs TO authenticated;
GRANT SELECT ON gf_variance_alerts TO authenticated;
GRANT SELECT ON gf_items TO authenticated;
GRANT SELECT ON gf_item_stock TO authenticated;
GRANT SELECT ON gf_customers TO authenticated;
GRANT SELECT ON gf_loyalty_transactions TO authenticated;

-- Grant INSERT/UPDATE to service role for API sync
GRANT INSERT, UPDATE ON gf_sales TO service_role;
GRANT INSERT, UPDATE ON gf_reconciliation_logs TO service_role;
GRANT INSERT, UPDATE ON gf_variance_alerts TO service_role;
GRANT INSERT, UPDATE ON gf_items TO service_role;
GRANT INSERT, UPDATE ON gf_item_stock TO service_role;
GRANT INSERT, UPDATE ON gf_customers TO service_role;
GRANT INSERT, UPDATE ON gf_loyalty_transactions TO service_role;