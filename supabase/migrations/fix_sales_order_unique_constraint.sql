-- Fix sales orders unique constraint to allow same order number across different stores
-- Drop the global unique constraint on order_number
ALTER TABLE public.sales_orders DROP CONSTRAINT IF EXISTS sales_orders_order_number_key;

-- Add composite unique constraint on (order_number, store_id)
ALTER TABLE public.sales_orders ADD CONSTRAINT sales_orders_order_number_store_unique 
    UNIQUE (order_number, store_id);