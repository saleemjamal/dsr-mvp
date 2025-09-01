-- Fix for missing cash_movements records for approved adjustments
-- This handles cases where the trigger didn't run or failed

-- Step 1: Insert missing cash_movements for completed adjustments
INSERT INTO cash_movements (
  store_id,
  movement_date,
  movement_type,
  amount,
  account_type,
  reference_type,
  reference_id,
  description,
  created_by
)
SELECT 
  ct.store_id,
  COALESCE(ct.approval_date::date, ct.request_date::date, CURRENT_DATE),
  'adjustment',
  COALESCE(ct.approved_amount, ct.requested_amount),
  ct.account_type,
  'cash_adjustment',
  ct.id,
  CONCAT(
    'Adjustment (', ct.adjustment_type, '): ',
    ct.reason,
    CASE 
      WHEN ct.approval_notes IS NOT NULL 
      THEN CONCAT(' | Approval note: ', ct.approval_notes)
      ELSE ''
    END
  ),
  COALESCE(ct.approved_by, ct.requested_by, 'System')
FROM cash_transfers ct
LEFT JOIN cash_movements cm ON cm.reference_id = ct.id AND cm.reference_type = 'cash_adjustment'
WHERE ct.is_adjustment = true 
  AND ct.status IN ('approved', 'completed')
  AND cm.id IS NULL;  -- Only insert if movement doesn't exist

-- Step 2: Update the trigger to handle all cases properly
CREATE OR REPLACE FUNCTION process_approved_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an adjustment being approved
  IF NEW.is_adjustment = true AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    
    -- Check if movement already exists (to prevent duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM cash_movements 
      WHERE reference_id = NEW.id 
      AND reference_type = 'cash_adjustment'
    ) THEN
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
        NEW.store_id,  -- Use NEW.store_id to ensure correct store
        CURRENT_DATE,
        'adjustment',
        COALESCE(NEW.approved_amount, NEW.requested_amount),
        NEW.account_type,
        'cash_adjustment',
        NEW.id,
        CONCAT(
          'Adjustment (', NEW.adjustment_type, '): ',
          NEW.reason,
          CASE 
            WHEN NEW.approval_notes IS NOT NULL 
            THEN CONCAT(' | Approval note: ', NEW.approval_notes)
            ELSE ''
          END
        ),
        COALESCE(NEW.approved_by, NEW.requested_by, 'System')
      );
    END IF;
    
    -- Mark the adjustment as completed
    NEW.status := 'completed';
    NEW.executed_at := NOW();
    NEW.executed_by := COALESCE(NEW.approved_by, NEW.requested_by, 'System');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS process_adjustment_on_approval ON public.cash_transfers;
CREATE TRIGGER process_adjustment_on_approval
BEFORE UPDATE ON public.cash_transfers
FOR EACH ROW
EXECUTE FUNCTION process_approved_adjustment();

-- Step 4: Verify the fix by checking current balances
DO $$
DECLARE
  store_record RECORD;
  balance_result NUMERIC;
BEGIN
  -- Check balance for each store with adjustments
  FOR store_record IN 
    SELECT DISTINCT s.id, s.store_name, s.store_code
    FROM stores s
    JOIN cash_transfers ct ON ct.store_id = s.id
    WHERE ct.is_adjustment = true
  LOOP
    -- Get petty cash balance
    balance_result := get_current_cash_balance(store_record.id, 'petty_cash');
    RAISE NOTICE 'Store % (%): Petty Cash Balance = %', 
      store_record.store_name, 
      store_record.store_code, 
      COALESCE(balance_result, 0);
    
    -- Get sales cash balance  
    balance_result := get_current_cash_balance(store_record.id, 'sales_cash');
    RAISE NOTICE 'Store % (%): Sales Cash Balance = %', 
      store_record.store_name, 
      store_record.store_code, 
      COALESCE(balance_result, 0);
  END LOOP;
END $$;