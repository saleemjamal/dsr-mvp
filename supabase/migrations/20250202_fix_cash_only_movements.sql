-- ==========================================
-- FIX: Ensure only CASH transactions create cash movements
-- ==========================================

-- Drop and recreate the function with cash-only validation
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
  -- Only create movement if tender type is cash
  IF LOWER(p_tender_type) != 'cash' THEN
    -- Return NULL for non-cash transactions (no movement created)
    RETURN NULL;
  END IF;

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
    'advance',
    p_amount,
    'sales_cash',
    'sales_order',
    p_reference_id,
    'Cash advance payment for Sales Order',
    p_created_by
  ) RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment for clarity
COMMENT ON FUNCTION create_so_advance_movement IS 'Creates cash movement for SO advances - only processes CASH tender types, returns NULL for non-cash';

-- ==========================================
-- Clean up any non-cash movements that might have been created
-- ==========================================

-- First, let's identify non-cash movements by checking against source tables
-- This is a safety check - shouldn't find any if everything is working correctly

-- Check Sales Orders with non-cash advances
DO $$
DECLARE
  non_cash_count INTEGER;
BEGIN
  -- Count movements that shouldn't exist
  SELECT COUNT(*) INTO non_cash_count
  FROM public.cash_movements cm
  JOIN public.sales_orders so ON so.id = cm.reference_id
  WHERE cm.movement_type = 'advance'
    AND cm.reference_type = 'sales_order'
    AND LOWER(so.tender_type) != 'cash';
    
  IF non_cash_count > 0 THEN
    RAISE NOTICE 'Found % non-cash advance movements that need cleanup', non_cash_count;
    
    -- Delete these invalid movements
    DELETE FROM public.cash_movements
    WHERE id IN (
      SELECT cm.id
      FROM public.cash_movements cm
      JOIN public.sales_orders so ON so.id = cm.reference_id
      WHERE cm.movement_type = 'advance'
        AND cm.reference_type = 'sales_order'
        AND LOWER(so.tender_type) != 'cash'
    );
    
    RAISE NOTICE 'Cleaned up % non-cash movements', non_cash_count;
  ELSE
    RAISE NOTICE 'No non-cash movements found - system is clean';
  END IF;
END $$;

-- ==========================================
-- Update daily positions trigger to double-check
-- ==========================================

CREATE OR REPLACE FUNCTION update_daily_position_from_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process sales_cash movements (petty cash handled separately)
  IF NEW.account_type != 'sales_cash' THEN
    RETURN NEW;
  END IF;

  -- Additional safety: Skip if this is a non-cash sale/advance
  -- (though these shouldn't exist in cash_movements at all)
  IF NEW.movement_type IN ('sale', 'advance') THEN
    -- Verify this is actually a cash transaction
    -- This is a safety net - movements should already be cash-only
    PERFORM 1 WHERE EXISTS (
      SELECT 1 FROM public.sales s
      WHERE s.id = NEW.reference_id 
      AND LOWER(s.tender_type) != 'cash'
    );
    IF FOUND THEN
      RAISE WARNING 'Non-cash movement detected in cash_movements table: %', NEW.id;
      RETURN NEW; -- Don't process but don't fail
    END IF;
  END IF;

  -- Get or create daily position for the movement date
  INSERT INTO public.daily_cash_positions (store_id, business_date, opening_balance)
  VALUES (NEW.store_id, NEW.movement_date::date, 0)
  ON CONFLICT (store_id, business_date) DO NOTHING;
  
  -- Update the appropriate column based on movement type
  UPDATE public.daily_cash_positions
  SET 
    cash_sales = CASE 
      WHEN NEW.movement_type = 'sale'
      THEN COALESCE(cash_sales, 0) + NEW.amount
      ELSE cash_sales
    END,
    so_advances = CASE
      WHEN NEW.movement_type = 'advance' 
      THEN COALESCE(so_advances, 0) + NEW.amount  
      ELSE so_advances
    END,
    petty_transfers_out = CASE
      WHEN NEW.movement_type = 'transfer_out'
      THEN COALESCE(petty_transfers_out, 0) + NEW.amount
      ELSE petty_transfers_out
    END,
    petty_transfers_in = CASE
      WHEN NEW.movement_type = 'transfer_in'
      THEN COALESCE(petty_transfers_in, 0) + NEW.amount
      ELSE petty_transfers_in
    END,
    cash_deposits = CASE
      WHEN NEW.movement_type = 'deposit'
      THEN COALESCE(cash_deposits, 0) + ABS(NEW.amount)
      ELSE cash_deposits
    END,
    updated_at = NOW()
  WHERE store_id = NEW.store_id 
    AND business_date = NEW.movement_date::date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_daily_position ON public.cash_movements;
CREATE TRIGGER trigger_update_daily_position
AFTER INSERT ON public.cash_movements
FOR EACH ROW
EXECUTE FUNCTION update_daily_position_from_movement();

-- ==========================================
-- Validation function to ensure cash-only movements
-- ==========================================

CREATE OR REPLACE FUNCTION validate_cash_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- For sales movements, verify tender type is cash
  IF NEW.movement_type = 'sale' AND NEW.reference_type = 'sale' THEN
    PERFORM 1 FROM public.sales 
    WHERE id = NEW.reference_id 
    AND LOWER(tender_type) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash sale';
    END IF;
  END IF;
  
  -- For advance movements, verify tender type is cash
  IF NEW.movement_type = 'advance' AND NEW.reference_type = 'sales_order' THEN
    PERFORM 1 FROM public.sales_orders 
    WHERE id = NEW.reference_id 
    AND LOWER(tender_type) = 'cash';
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot create cash movement for non-cash advance';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger
DROP TRIGGER IF EXISTS validate_cash_movement_trigger ON public.cash_movements;
CREATE TRIGGER validate_cash_movement_trigger
BEFORE INSERT ON public.cash_movements
FOR EACH ROW
EXECUTE FUNCTION validate_cash_movement();

-- ==========================================
-- Update historical daily positions
-- ==========================================

-- Recalculate daily positions to ensure accuracy
-- This will correct any positions that included non-cash transactions
UPDATE public.daily_cash_positions dcp
SET 
  cash_sales = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.cash_movements cm
    WHERE cm.store_id = dcp.store_id
      AND cm.movement_date::date = dcp.business_date
      AND cm.movement_type = 'sale'
      AND cm.account_type = 'sales_cash'
  ),
  so_advances = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.cash_movements cm
    WHERE cm.store_id = dcp.store_id
      AND cm.movement_date::date = dcp.business_date
      AND cm.movement_type = 'advance'
      AND cm.account_type = 'sales_cash'
  ),
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.cash_movements cm
  WHERE cm.store_id = dcp.store_id
    AND cm.movement_date::date = dcp.business_date
);

-- Add comment
COMMENT ON FUNCTION validate_cash_movement IS 'Ensures only cash transactions can create cash movements - prevents non-cash entries';