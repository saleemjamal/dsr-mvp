-- Database Indexes and Performance Optimization
-- This file contains all database indexes for optimal query performance

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

-- Sales orders indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_store_date ON sales_orders(store_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);

-- Returns indexes
CREATE INDEX IF NOT EXISTS idx_returns_store_date ON returns(store_id, return_date DESC);
CREATE INDEX IF NOT EXISTS idx_returns_bill_ref ON returns(original_bill_reference);

-- Damage reports indexes
CREATE INDEX IF NOT EXISTS idx_damage_store_date ON damage_reports(store_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_damage_status ON damage_reports(status);
CREATE INDEX IF NOT EXISTS idx_damage_supplier ON damage_reports(supplier_name);