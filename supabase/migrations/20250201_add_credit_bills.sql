-- Migration: Add Credit Bills Support
-- =====================================
-- This migration adds support for converting Sales Orders to Credit Bills
-- with full audit trail and variance tracking

-- 1. Add reference fields to sales table to link to source documents
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50), -- 'sales_order', 'hand_bill', null
ADD COLUMN IF NOT EXISTS reference_id UUID, -- FK to source document
ADD COLUMN IF NOT EXISTS sale_type VARCHAR(50) DEFAULT 'regular'; -- 'regular', 'credit_bill'

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_reference ON public.sales(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_sales_type ON public.sales(sale_type);

-- 2. Create audit table for SO to Credit Bill conversions
CREATE TABLE IF NOT EXISTS public.credit_bill_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id),
  sales_id UUID REFERENCES public.sales(id),
  store_id UUID NOT NULL REFERENCES public.stores(id),
  
  -- Original SO details
  original_amount DECIMAL(12,2) NOT NULL,
  advance_paid DECIMAL(12,2) DEFAULT 0,
  
  -- Final bill details
  final_amount DECIMAL(12,2) NOT NULL,
  balance_paid DECIMAL(12,2) DEFAULT 0,
  refund_amount DECIMAL(12,2) DEFAULT 0,
  
  -- Variance tracking
  amount_variance DECIMAL(12,2) GENERATED ALWAYS AS (final_amount - original_amount) STORED,
  variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN original_amount = 0 THEN 0
      ELSE ((final_amount - original_amount) / original_amount * 100)
    END
  ) STORED,
  variance_reason TEXT,
  variance_type VARCHAR(20) GENERATED ALWAYS AS (
    CASE 
      WHEN final_amount > original_amount THEN 'increased'
      WHEN final_amount < original_amount THEN 'decreased'
      ELSE 'no_change'
    END
  ) STORED,
  
  -- Payment details
  balance_tender_type VARCHAR(50),
  credit_bill_number VARCHAR(50),
  
  -- Metadata
  converted_by UUID NOT NULL REFERENCES public.user_profiles(id),
  conversion_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for reporting
CREATE INDEX IF NOT EXISTS idx_credit_bill_audit_so ON public.credit_bill_audit(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_credit_bill_audit_sales ON public.credit_bill_audit(sales_id);
CREATE INDEX IF NOT EXISTS idx_credit_bill_audit_store ON public.credit_bill_audit(store_id);
CREATE INDEX IF NOT EXISTS idx_credit_bill_audit_date ON public.credit_bill_audit(conversion_date);
CREATE INDEX IF NOT EXISTS idx_credit_bill_audit_variance ON public.credit_bill_audit(variance_type, amount_variance);

-- 3. Add fields to sales_orders for tracking conversion
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS final_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS variance_reason TEXT;

-- 4. Update cash_movements to properly track SO advances
-- Add new movement type for sales order advances if not exists
DO $$ 
BEGIN
  -- Check if we need to add the advance type to any existing constraint
  -- For now, we'll just ensure the column can accept 'advance' as a value
  -- The cash_movements table already has movement_type as TEXT, so no changes needed
END $$;

-- 5. Create a view for easy credit bill reporting
CREATE OR REPLACE VIEW public.credit_bills_summary AS
SELECT 
  cba.id,
  cba.credit_bill_number,
  cba.conversion_date,
  so.order_number as sales_order_number,
  so.customer_name,
  so.customer_phone,
  s.store_name,
  s.store_code,
  cba.original_amount,
  cba.final_amount,
  cba.amount_variance,
  cba.variance_percentage,
  cba.variance_type,
  cba.variance_reason,
  cba.advance_paid,
  cba.balance_paid,
  cba.refund_amount,
  cba.balance_tender_type,
  up.full_name as converted_by_name,
  cba.notes
FROM public.credit_bill_audit cba
JOIN public.sales_orders so ON so.id = cba.sales_order_id
JOIN public.stores s ON s.id = cba.store_id
JOIN public.user_profiles up ON up.id = cba.converted_by
ORDER BY cba.conversion_date DESC;

-- 6. Function to create cash movement for SO advance
CREATE OR REPLACE FUNCTION create_so_advance_movement(
  p_store_id UUID,
  p_amount DECIMAL,
  p_tender_type VARCHAR,
  p_reference_id UUID,
  p_created_by VARCHAR DEFAULT 'System'
) RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  INSERT INTO public.cash_movements (
    store_id,
    movement_date,
    movement_type,
    amount,
    account_type,
    reference_type,
    reference_id,
    description,
    created_by
  ) VALUES (
    p_store_id,
    CURRENT_DATE,
    'advance',  -- New movement type for advances
    p_amount,
    'sales_cash',  -- Advances go to sales cash
    'sales_order',
    p_reference_id,
    'Advance payment for Sales Order',
    p_created_by
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to convert SO to Credit Bill
CREATE OR REPLACE FUNCTION convert_so_to_credit_bill(
  p_so_id UUID,
  p_final_amount DECIMAL,
  p_balance_paid DECIMAL,
  p_balance_tender_type VARCHAR,
  p_credit_bill_number VARCHAR,
  p_variance_reason TEXT,
  p_notes TEXT,
  p_converted_by UUID
) RETURNS JSONB AS $$
DECLARE
  v_so RECORD;
  v_sales_id UUID;
  v_audit_id UUID;
  v_refund_amount DECIMAL DEFAULT 0;
  v_result JSONB;
BEGIN
  -- Get SO details
  SELECT * INTO v_so FROM public.sales_orders WHERE id = p_so_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales Order not found';
  END IF;
  
  -- Calculate refund if any
  IF (v_so.advance_amount - (p_final_amount - p_balance_paid)) > 0 THEN
    v_refund_amount := v_so.advance_amount - (p_final_amount - p_balance_paid);
  END IF;
  
  -- Create sales entry for credit bill
  INSERT INTO public.sales (
    store_id,
    sale_date,
    amount,
    tender_type,
    sale_type,
    reference_type,
    reference_id,
    notes,
    created_by
  ) VALUES (
    v_so.store_id,
    CURRENT_DATE,
    p_final_amount,
    p_balance_tender_type,
    'credit_bill',
    'sales_order',
    p_so_id,
    p_notes,
    p_converted_by::TEXT
  ) RETURNING id INTO v_sales_id;
  
  -- Create audit entry
  INSERT INTO public.credit_bill_audit (
    sales_order_id,
    sales_id,
    store_id,
    original_amount,
    advance_paid,
    final_amount,
    balance_paid,
    refund_amount,
    variance_reason,
    balance_tender_type,
    credit_bill_number,
    converted_by,
    notes
  ) VALUES (
    p_so_id,
    v_sales_id,
    v_so.store_id,
    v_so.total_amount,
    v_so.advance_amount,
    p_final_amount,
    p_balance_paid,
    v_refund_amount,
    p_variance_reason,
    p_balance_tender_type,
    p_credit_bill_number,
    p_converted_by,
    p_notes
  ) RETURNING id INTO v_audit_id;
  
  -- Update SO status and link to sale
  UPDATE public.sales_orders 
  SET 
    status = 'delivered',
    converted_sale_id = v_sales_id::TEXT,
    final_amount = p_final_amount,
    variance_reason = p_variance_reason,
    balance_amount_paid = p_balance_paid,
    balance_tender_type = p_balance_tender_type,
    balance_payment_date = CURRENT_TIMESTAMP
  WHERE id = p_so_id;
  
  -- Create cash movement for balance payment (if any)
  IF p_balance_paid > 0 THEN
    INSERT INTO public.cash_movements (
      store_id,
      movement_date,
      movement_type,
      amount,
      account_type,
      reference_type,
      reference_id,
      description,
      created_by
    ) VALUES (
      v_so.store_id,
      CURRENT_DATE,
      'sale',
      p_balance_paid,
      'sales_cash',
      'credit_bill',
      v_sales_id,
      'Balance payment for Credit Bill ' || p_credit_bill_number,
      p_converted_by::TEXT
    );
  END IF;
  
  -- Create cash movement for refund (if any)
  IF v_refund_amount > 0 THEN
    INSERT INTO public.cash_movements (
      store_id,
      movement_date,
      movement_type,
      amount,
      account_type,
      reference_type,
      reference_id,
      description,
      created_by
    ) VALUES (
      v_so.store_id,
      CURRENT_DATE,
      'refund',
      -v_refund_amount,  -- Negative amount for refund
      'sales_cash',
      'credit_bill',
      v_sales_id,
      'Refund for Credit Bill ' || p_credit_bill_number,
      p_converted_by::TEXT
    );
  END IF;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'sales_id', v_sales_id,
    'audit_id', v_audit_id,
    'credit_bill_number', p_credit_bill_number,
    'refund_amount', v_refund_amount
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON public.credit_bill_audit TO authenticated;
GRANT INSERT, UPDATE ON public.credit_bill_audit TO authenticated;
GRANT SELECT ON public.credit_bills_summary TO authenticated;
GRANT EXECUTE ON FUNCTION create_so_advance_movement TO authenticated;
GRANT EXECUTE ON FUNCTION convert_so_to_credit_bill TO authenticated;