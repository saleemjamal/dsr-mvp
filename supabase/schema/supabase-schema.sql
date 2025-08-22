-- DSR Simplified MVP - Complete Supabase Schema
-- Copy and paste this entire file into your Supabase SQL Editor
-- Created: January 2025

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code VARCHAR(10) NOT NULL UNIQUE,
  store_name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tender_type VARCHAR(20) NOT NULL CHECK (tender_type IN ('cash', 'credit_card', 'upi', 'gift_voucher', 'bank_transfer')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  transaction_reference VARCHAR(100),
  customer_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses table  
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  voucher_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Gift vouchers table
CREATE TABLE IF NOT EXISTS gift_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  balance DECIMAL(12,2) NOT NULL CHECK (balance >= 0),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'cancelled', 'expired')),
  issued_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table (for future use)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  address TEXT,
  origin_store_id UUID REFERENCES stores(id),
  credit_limit DECIMAL(12,2) DEFAULT 0,
  outstanding_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hand bills table (for POS failure backup)
CREATE TABLE IF NOT EXISTS hand_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bill_number VARCHAR(50),
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  tender_type VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  items_description TEXT,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'cancelled')),
  converted_sale_id UUID REFERENCES sales(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales orders table  
CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  order_number VARCHAR(50) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  items_description TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  advance_amount DECIMAL(12,2) DEFAULT 0,
  balance_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Returns table (RRN - Returns without exchange)
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_bill_reference VARCHAR(100),
  return_amount DECIMAL(12,2) NOT NULL CHECK (return_amount > 0),
  refund_method VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Damage reports table
CREATE TABLE IF NOT EXISTS damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name VARCHAR(255),
  item_code VARCHAR(100),
  item_brand VARCHAR(255),
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  estimated_value DECIMAL(12,2),
  action_taken TEXT,
  credit_note_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'investigating', 'resolved', 'closed')),
  images_urls TEXT[], -- Array of image URLs
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON sales(store_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_tender_type ON sales(tender_type);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);

-- Expenses indexes  
CREATE INDEX IF NOT EXISTS idx_expenses_store_date ON expenses(store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);

-- Gift vouchers indexes
CREATE INDEX IF NOT EXISTS idx_vouchers_number ON gift_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON gift_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_vouchers_expiry ON gift_vouchers(expiry_date);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_origin_store ON customers(origin_store_id);

-- Hand bills indexes
CREATE INDEX IF NOT EXISTS idx_hand_bills_store_date ON hand_bills(store_id, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_hand_bills_status ON hand_bills(status);

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_vouchers_updated_at BEFORE UPDATE ON gift_vouchers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- BUSINESS LOGIC FUNCTIONS
-- ==========================================

-- Function to calculate daily cash variance
CREATE OR REPLACE FUNCTION get_daily_cash_summary(target_date DATE DEFAULT CURRENT_DATE, target_store_id UUID DEFAULT NULL)
RETURNS TABLE (
    store_id UUID,
    store_name VARCHAR,
    cash_sales DECIMAL,
    cash_expenses DECIMAL,
    net_cash DECIMAL,
    transaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as store_id,
        s.store_name,
        COALESCE(sales_data.cash_sales, 0) as cash_sales,
        COALESCE(expense_data.cash_expenses, 0) as cash_expenses,
        COALESCE(sales_data.cash_sales, 0) - COALESCE(expense_data.cash_expenses, 0) as net_cash,
        COALESCE(sales_data.sales_count, 0) + COALESCE(expense_data.expense_count, 0) as transaction_count
    FROM stores s
    LEFT JOIN (
        SELECT 
            store_id,
            SUM(CASE WHEN tender_type = 'cash' THEN amount ELSE 0 END) as cash_sales,
            COUNT(*) as sales_count
        FROM sales 
        WHERE sale_date = target_date
        AND (target_store_id IS NULL OR store_id = target_store_id)
        GROUP BY store_id
    ) sales_data ON s.id = sales_data.store_id
    LEFT JOIN (
        SELECT 
            store_id,
            SUM(amount) as cash_expenses,
            COUNT(*) as expense_count
        FROM expenses 
        WHERE expense_date = target_date
        AND (target_store_id IS NULL OR store_id = target_store_id)
        GROUP BY store_id
    ) expense_data ON s.id = expense_data.store_id
    WHERE s.is_active = true
    AND (target_store_id IS NULL OR s.id = target_store_id);
END;
$$ LANGUAGE plpgsql;

-- Function to get store performance metrics
CREATE OR REPLACE FUNCTION get_store_metrics(target_store_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_sales DECIMAL,
    total_expenses DECIMAL,
    net_revenue DECIMAL,
    avg_daily_sales DECIMAL,
    transaction_count INTEGER,
    top_tender_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(s.amount), 0) as total_sales,
        COALESCE(SUM(e.amount), 0) as total_expenses,
        COALESCE(SUM(s.amount), 0) - COALESCE(SUM(e.amount), 0) as net_revenue,
        COALESCE(SUM(s.amount), 0) / days_back as avg_daily_sales,
        COUNT(s.id)::INTEGER as transaction_count,
        (
            SELECT tender_type 
            FROM sales 
            WHERE store_id = target_store_id 
            AND sale_date >= CURRENT_DATE - INTERVAL '%s days' 
            GROUP BY tender_type 
            ORDER BY COUNT(*) DESC 
            LIMIT 1
        ) as top_tender_type
    FROM sales s
    FULL OUTER JOIN expenses e ON s.store_id = e.store_id AND s.sale_date = e.expense_date
    WHERE (s.store_id = target_store_id OR e.store_id = target_store_id)
    AND (s.sale_date >= CURRENT_DATE - INTERVAL '%s days' OR e.expense_date >= CURRENT_DATE - INTERVAL '%s days');
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- SAMPLE DATA
-- ==========================================

-- Insert sample stores
INSERT INTO stores (store_code, store_name, address, phone, email) VALUES 
('CBD', 'CBD Store', 'Central Business District, Mumbai', '+91 98765 43210', 'cbd@poppat.com'),
('FSN', 'Fashion Store', 'Fashion Street, Mumbai', '+91 98765 43211', 'fashion@poppat.com'),
('HOME', 'Home Store', 'Home Decor District, Mumbai', '+91 98765 43212', 'home@poppat.com'),
('ELEC', 'Electronics Store', 'Electronics Market, Mumbai', '+91 98765 43213', 'electronics@poppat.com')
ON CONFLICT (store_code) DO NOTHING;

-- Insert sample customers
INSERT INTO customers (customer_name, phone, email, origin_store_id) 
SELECT 
    'Sample Customer ' || generate_series(1, 5),
    '+91 9876543' || LPAD(generate_series(1, 5)::text, 3, '0'),
    'customer' || generate_series(1, 5) || '@example.com',
    (SELECT id FROM stores ORDER BY RANDOM() LIMIT 1)
ON CONFLICT (phone) DO NOTHING;

-- Insert sample sales data (last 7 days)
INSERT INTO sales (store_id, sale_date, tender_type, amount, notes)
SELECT 
    (SELECT id FROM stores ORDER BY RANDOM() LIMIT 1),
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6),
    (ARRAY['cash', 'credit_card', 'upi', 'gift_voucher'])[floor(random() * 4 + 1)],
    (random() * 5000 + 500)::decimal(10,2),
    'Sample sale transaction'
FROM generate_series(1, 20);

-- Insert sample expenses data
INSERT INTO expenses (store_id, expense_date, category, amount, description)
SELECT 
    (SELECT id FROM stores ORDER BY RANDOM() LIMIT 1),
    CURRENT_DATE - INTERVAL '1 day' * generate_series(0, 6),
    (ARRAY['Staff Welfare', 'Logistics', 'Utilities', 'Office Supplies', 'Maintenance', 'Miscellaneous'])[floor(random() * 6 + 1)],
    (random() * 2000 + 100)::decimal(10,2),
    'Sample expense transaction for ' || (ARRAY['office supplies', 'staff refreshments', 'electricity bill', 'courier charges', 'cleaning services', 'miscellaneous items'])[floor(random() * 6 + 1)]
FROM generate_series(1, 15);

-- Insert sample gift vouchers
INSERT INTO gift_vouchers (voucher_number, amount, balance, status, customer_name, customer_phone, expiry_date) VALUES 
('GV2025001', 1000.00, 1000.00, 'active', 'Rahul Sharma', '+91 9876543001', CURRENT_DATE + INTERVAL '365 days'),
('GV2025002', 500.00, 250.00, 'active', 'Priya Patel', '+91 9876543002', CURRENT_DATE + INTERVAL '365 days'),
('GV2025003', 2000.00, 0.00, 'redeemed', 'Amit Kumar', '+91 9876543003', CURRENT_DATE + INTERVAL '365 days'),
('GV2025004', 1500.00, 750.00, 'active', 'Sneha Singh', '+91 9876543004', CURRENT_DATE + INTERVAL '365 days'),
('GV2025005', 800.00, 800.00, 'active', 'Vikram Gupta', '+91 9876543005', CURRENT_DATE + INTERVAL '365 days')
ON CONFLICT (voucher_number) DO NOTHING;

-- ==========================================
-- ROW LEVEL SECURITY (For Future Auth)
-- ==========================================

-- Enable RLS on all tables (commented out for MVP)
-- ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE gift_vouchers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hand_bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE damage_reports ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- VIEWS FOR EASY QUERYING
-- ==========================================

-- Sales with store information
CREATE OR REPLACE VIEW sales_with_store AS
SELECT 
    s.*,
    st.store_code,
    st.store_name
FROM sales s
JOIN stores st ON s.store_id = st.id;

-- Expenses with store information  
CREATE OR REPLACE VIEW expenses_with_store AS
SELECT 
    e.*,
    st.store_code,
    st.store_name
FROM expenses e
JOIN stores st ON e.store_id = st.id;

-- Daily summary view
CREATE OR REPLACE VIEW daily_summary AS
SELECT 
    store_id,
    sale_date as summary_date,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    STRING_AGG(DISTINCT tender_type, ', ') as tender_types_used
FROM sales
GROUP BY store_id, sale_date
ORDER BY sale_date DESC, store_id;

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

-- If you see this message, the schema has been created successfully!
DO $$
BEGIN
    RAISE NOTICE 'DSR Simplified MVP database schema created successfully!';
    RAISE NOTICE 'Tables created: stores, sales, expenses, gift_vouchers, customers, hand_bills, sales_orders, returns, damage_reports';
    RAISE NOTICE 'Sample data inserted for testing';
    RAISE NOTICE 'You can now connect your Next.js app to this database';
END $$;