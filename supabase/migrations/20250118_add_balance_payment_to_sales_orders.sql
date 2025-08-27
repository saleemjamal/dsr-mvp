-- Add balance payment tracking columns to sales_orders table
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS balance_amount_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_tender_type TEXT,
ADD COLUMN IF NOT EXISTS balance_payment_date TIMESTAMP;

-- Add comments to explain the columns
COMMENT ON COLUMN sales_orders.balance_amount_paid IS 'Amount paid for balance during conversion to sale';
COMMENT ON COLUMN sales_orders.balance_tender_type IS 'Payment method used for balance payment (cash, upi, etc)';
COMMENT ON COLUMN sales_orders.balance_payment_date IS 'Date when balance payment was collected during conversion';