-- Tender Type Column Updates
-- This file adds tender_type columns to tables that need payment method tracking

-- ==========================================
-- ADD TENDER TYPE COLUMNS
-- ==========================================

-- Add tender_type to gift_vouchers table
-- This tracks the payment method used when purchasing the voucher
ALTER TABLE gift_vouchers 
ADD COLUMN IF NOT EXISTS tender_type VARCHAR(20) 
CHECK (tender_type IN ('cash', 'credit_card', 'upi', 'gift_voucher', 'bank_transfer'));

-- Add comment for clarity
COMMENT ON COLUMN gift_vouchers.tender_type IS 'Payment method used when purchasing the gift voucher';

-- Update existing sales_orders table to ensure tender_type column exists
-- The table already exists from 02_customer_management.sql, but may need tender_type column
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS tender_type VARCHAR(20) 
CHECK (tender_type IN ('cash', 'credit_card', 'upi', 'gift_voucher', 'bank_transfer'));

-- Add comment for clarity
COMMENT ON COLUMN sales_orders.tender_type IS 'Payment method used for advance payment (null if no advance paid)';

-- Update existing hand_bills table to ensure proper tender_type constraint
-- The table already exists from 02_customer_management.sql and has tender_type column
-- Just ensure the constraint is updated if needed
ALTER TABLE hand_bills DROP CONSTRAINT IF EXISTS hand_bills_tender_type_check;
ALTER TABLE hand_bills 
ADD CONSTRAINT hand_bills_tender_type_check 
CHECK (tender_type IN ('cash', 'credit_card', 'upi', 'gift_voucher', 'bank_transfer'));

-- Add comment for clarity  
COMMENT ON COLUMN hand_bills.tender_type IS 'Payment method used for the hand bill transaction';

-- ==========================================
-- UPDATE TRIGGERS (if needed)
-- ==========================================

-- Note: Triggers for sales_orders and hand_bills should already exist from previous schema files
-- This section is kept for reference but may not be needed

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Indexes for sales_orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_phone ON sales_orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_delivery_date ON sales_orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tender_type ON sales_orders(tender_type);

-- Index for hand_bills tender_type (if not already exists)
CREATE INDEX IF NOT EXISTS idx_hand_bills_tender_type ON hand_bills(tender_type);

-- Index for gift_vouchers tender_type
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_tender_type ON gift_vouchers(tender_type);

-- ==========================================
-- CONSTRAINTS AND VALIDATIONS
-- ==========================================

-- Note: sales_orders balance calculation should already be handled by existing schema
-- The existing schema uses 'balance_amount GENERATED ALWAYS AS (total_amount - advance_amount) STORED'

-- Ensure tender_type is provided when advance is paid for sales_orders
-- Note: sales_orders uses 'advance_amount' not 'advance_paid' based on existing schema
ALTER TABLE sales_orders 
ADD CONSTRAINT check_sales_orders_tender_type_required 
CHECK (
    (COALESCE(advance_amount, 0) = 0 AND tender_type IS NULL) OR 
    (COALESCE(advance_amount, 0) > 0 AND tender_type IS NOT NULL)
);

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN sales_orders.tender_type IS 'Payment method used for advance payment (null if no advance paid)';
COMMENT ON COLUMN hand_bills.tender_type IS 'Payment method used for the hand bill transaction';
COMMENT ON COLUMN gift_vouchers.tender_type IS 'Payment method used when purchasing the gift voucher';