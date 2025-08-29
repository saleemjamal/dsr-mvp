-- =====================================================
-- Add Cash Adjustment Support
-- =====================================================
-- This migration adds support for cash adjustments with approval workflow
-- All adjustments require approval and maintain audit trail

-- Step 1: Add adjustment-specific fields to cash_transfers table
ALTER TABLE public.cash_transfers 
ADD COLUMN IF NOT EXISTS adjustment_type character varying 
  CHECK (adjustment_type IS NULL OR adjustment_type::text = ANY (
    ARRAY['initial_setup'::character varying, 
          'correction'::character varying, 
          'injection'::character varying, 
          'loss'::character varying]::text[]
  )),
ADD COLUMN IF NOT EXISTS account_type character varying DEFAULT 'petty_cash'
  CHECK (account_type::text = ANY (
    ARRAY['sales_cash'::character varying, 
          'petty_cash'::character varying]::text[]
  )),
ADD COLUMN IF NOT EXISTS is_adjustment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS current_balance_snapshot numeric;

-- Add comment to clarify usage
COMMENT ON COLUMN public.cash_transfers.adjustment_type IS 'Type of adjustment: initial_setup for new stores, correction for discrepancies, injection for adding funds, loss for theft/shortage';
COMMENT ON COLUMN public.cash_transfers.account_type IS 'Which cash account to adjust: sales_cash or petty_cash';
COMMENT ON COLUMN public.cash_transfers.is_adjustment IS 'True if this is an adjustment request, false for regular transfer';
COMMENT ON COLUMN public.cash_transfers.current_balance_snapshot IS 'Current balance at time of adjustment request for audit purposes';

-- Step 2: Create function to process approved adjustments
CREATE OR REPLACE FUNCTION process_approved_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  adjustment_record RECORD;
BEGIN
  -- Only process if this is an adjustment being approved
  IF NEW.is_adjustment = true AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Get the full adjustment record
    SELECT * INTO adjustment_record FROM cash_transfers WHERE id = NEW.id;
    
    -- Create cash movement record for the adjustment
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
      adjustment_record.store_id,
      CURRENT_DATE,
      'adjustment',
      COALESCE(adjustment_record.approved_amount, adjustment_record.requested_amount),
      adjustment_record.account_type,
      'cash_adjustment',
      adjustment_record.id,
      CONCAT(
        'Adjustment (', adjustment_record.adjustment_type, '): ',
        adjustment_record.reason,
        CASE 
          WHEN adjustment_record.approval_notes IS NOT NULL 
          THEN CONCAT(' | Approval note: ', adjustment_record.approval_notes)
          ELSE ''
        END
      ),
      adjustment_record.approved_by
    );
    
    -- Mark the adjustment as completed
    NEW.status := 'completed';
    NEW.executed_at := NOW();
    NEW.executed_by := adjustment_record.approved_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger to process adjustments
DROP TRIGGER IF EXISTS process_adjustment_on_approval ON public.cash_transfers;
CREATE TRIGGER process_adjustment_on_approval
BEFORE UPDATE ON public.cash_transfers
FOR EACH ROW
EXECUTE FUNCTION process_approved_adjustment();

-- Step 4: Create comprehensive audit view
CREATE OR REPLACE VIEW cash_adjustment_audit AS
SELECT 
  ct.id,
  ct.store_id,
  s.store_name,
  s.store_code,
  ct.adjustment_type,
  ct.account_type,
  ct.requested_amount,
  ct.approved_amount,
  COALESCE(ct.approved_amount, ct.requested_amount) as final_amount,
  ct.reason,
  ct.status,
  ct.priority,
  ct.requested_by,
  ct.approved_by,
  ct.request_date,
  ct.approval_date,
  ct.approval_notes,
  ct.executed_at,
  ct.current_balance_snapshot,
  -- Calculate variance if amount was modified
  CASE 
    WHEN ct.approved_amount IS NOT NULL AND ct.approved_amount != ct.requested_amount
    THEN ct.approved_amount - ct.requested_amount
    ELSE 0
  END as approval_variance,
  -- Movement details if completed
  cm.id as movement_id,
  cm.created_at as movement_created_at
FROM cash_transfers ct
JOIN stores s ON ct.store_id = s.id
LEFT JOIN cash_movements cm ON cm.reference_id = ct.id AND cm.reference_type = 'cash_adjustment'
WHERE ct.is_adjustment = true
ORDER BY ct.request_date DESC;

-- Step 5: Create summary view for dashboard
CREATE OR REPLACE VIEW cash_adjustment_summary AS
SELECT 
  store_id,
  account_type,
  COUNT(*) as total_adjustments,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_adjustments,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_adjustments,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_adjustments,
  COUNT(CASE WHEN adjustment_type = 'initial_setup' THEN 1 END) as initial_setups,
  COUNT(CASE WHEN adjustment_type = 'correction' THEN 1 END) as corrections,
  COUNT(CASE WHEN adjustment_type = 'injection' THEN 1 END) as injections,
  COUNT(CASE WHEN adjustment_type = 'loss' THEN 1 END) as losses,
  SUM(CASE WHEN status = 'completed' THEN COALESCE(approved_amount, requested_amount) ELSE 0 END) as total_adjusted_amount,
  MAX(request_date) as last_adjustment_date
FROM cash_transfers
WHERE is_adjustment = true
GROUP BY store_id, account_type;

-- Step 6: Add helper function to get current balance for adjustment page
CREATE OR REPLACE FUNCTION get_current_cash_balance(
  p_store_id uuid,
  p_account_type varchar
)
RETURNS numeric AS $$
DECLARE
  current_balance numeric;
BEGIN
  -- Get the sum of all movements for this account
  SELECT COALESCE(SUM(
    CASE 
      WHEN movement_type IN ('sale', 'advance', 'transfer_in', 'adjustment') 
      THEN amount
      WHEN movement_type IN ('expense', 'transfer_out', 'deposit')
      THEN -amount
      ELSE 0
    END
  ), 0)
  INTO current_balance
  FROM cash_movements
  WHERE store_id = p_store_id
  AND account_type = p_account_type;
  
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add validation function
CREATE OR REPLACE FUNCTION validate_adjustment_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate adjustment requests
  IF NEW.is_adjustment = true THEN
    -- Ensure adjustment type is set
    IF NEW.adjustment_type IS NULL THEN
      RAISE EXCEPTION 'Adjustment type is required for adjustment requests';
    END IF;
    
    -- Ensure account type is set
    IF NEW.account_type IS NULL THEN
      RAISE EXCEPTION 'Account type is required for adjustment requests';
    END IF;
    
    -- For loss adjustments, ensure amount is negative
    IF NEW.adjustment_type = 'loss' AND NEW.requested_amount > 0 THEN
      NEW.requested_amount := -ABS(NEW.requested_amount);
    END IF;
    
    -- For other adjustments, ensure amount is positive
    IF NEW.adjustment_type IN ('initial_setup', 'injection') AND NEW.requested_amount < 0 THEN
      NEW.requested_amount := ABS(NEW.requested_amount);
    END IF;
    
    -- Capture current balance snapshot
    NEW.current_balance_snapshot := get_current_cash_balance(NEW.store_id, NEW.account_type);
    
    -- Validate that adjustment won't cause negative balance
    IF (NEW.current_balance_snapshot + NEW.requested_amount) < 0 THEN
      RAISE EXCEPTION 'Adjustment would result in negative balance. Current %: %, Adjustment: %', 
        NEW.account_type, NEW.current_balance_snapshot, NEW.requested_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for validation
DROP TRIGGER IF EXISTS validate_adjustment_before_insert ON public.cash_transfers;
CREATE TRIGGER validate_adjustment_before_insert
BEFORE INSERT ON public.cash_transfers
FOR EACH ROW
EXECUTE FUNCTION validate_adjustment_request();

-- Step 9: Grant necessary permissions
GRANT SELECT ON cash_adjustment_audit TO authenticated;
GRANT SELECT ON cash_adjustment_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_cash_balance TO authenticated;

-- Step 10: Add helpful comments
COMMENT ON VIEW cash_adjustment_audit IS 'Complete audit trail of all cash adjustments with approval history';
COMMENT ON VIEW cash_adjustment_summary IS 'Summary statistics of cash adjustments by store and account type';
COMMENT ON FUNCTION get_current_cash_balance IS 'Get current balance for a specific cash account';
COMMENT ON FUNCTION validate_adjustment_request IS 'Validates adjustment requests to prevent negative balances';

-- Step 11: Sample data for testing (commented out)
/*
-- Example: Initial petty cash setup
INSERT INTO cash_transfers (
  store_id, 
  requested_amount, 
  reason, 
  status, 
  priority,
  requested_by,
  account_type,
  adjustment_type,
  is_adjustment
) VALUES (
  (SELECT id FROM stores WHERE store_code = 'STORE001'),
  5000,
  'Initial petty cash fund setup for new store',
  'pending',
  'high',
  'Store Manager',
  'petty_cash',
  'initial_setup',
  true
);
*/