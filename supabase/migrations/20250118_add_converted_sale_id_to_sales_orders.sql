-- Add converted_sale_id column to sales_orders table for tracking conversion to sales bills
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS converted_sale_id TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN sales_orders.converted_sale_id IS 'System sale ID when sales order is converted to a sales bill';