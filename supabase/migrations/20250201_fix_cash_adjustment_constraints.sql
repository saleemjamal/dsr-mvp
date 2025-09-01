-- Fix for cash adjustment constraints to allow negative amounts for loss adjustments
-- The current constraints conflict with the validation trigger logic

-- Step 1: Drop the existing check constraint on requested_amount
ALTER TABLE public.cash_transfers 
DROP CONSTRAINT IF EXISTS cash_transfers_requested_amount_check;

-- Step 2: Add a new constraint that allows negative amounts only for loss adjustments
ALTER TABLE public.cash_transfers 
ADD CONSTRAINT cash_transfers_requested_amount_check 
CHECK (
  (requested_amount > 0) OR 
  (requested_amount < 0 AND adjustment_type = 'loss' AND is_adjustment = true)
);

-- Step 3: Drop the existing check constraint on approved_amount
ALTER TABLE public.cash_transfers 
DROP CONSTRAINT IF EXISTS cash_transfers_approved_amount_check;

-- Step 4: Add a new constraint that allows negative amounts only for loss adjustments
ALTER TABLE public.cash_transfers 
ADD CONSTRAINT cash_transfers_approved_amount_check 
CHECK (
  approved_amount IS NULL OR
  (approved_amount >= 0) OR 
  (approved_amount < 0 AND adjustment_type = 'loss' AND is_adjustment = true)
);

-- Step 5: Update the validation function to handle amounts correctly
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
    
    -- For loss adjustments, requested_amount should be negative
    IF NEW.adjustment_type = 'loss' AND NEW.requested_amount > 0 THEN
      NEW.requested_amount := -ABS(NEW.requested_amount);
    END IF;
    
    -- For other adjustments, ensure amount is positive
    IF NEW.adjustment_type IN ('initial_setup', 'injection', 'correction') AND NEW.requested_amount < 0 THEN
      NEW.requested_amount := ABS(NEW.requested_amount);
    END IF;
    
    -- Capture current balance snapshot
    NEW.current_balance_snapshot := get_current_cash_balance(NEW.store_id, NEW.account_type);
    
    -- Validate that adjustment won't cause negative balance
    -- For loss adjustments, use the negative amount
    IF (NEW.current_balance_snapshot + NEW.requested_amount) < 0 THEN
      RAISE EXCEPTION 'Adjustment would result in negative balance. Current %: %, Adjustment: %', 
        NEW.account_type, NEW.current_balance_snapshot, NEW.requested_amount;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update the approval processing trigger to handle negative amounts correctly
CREATE OR REPLACE FUNCTION process_approved_adjustment()
RETURNS TRIGGER AS $$
DECLARE
  adjustment_record RECORD;
  final_amount numeric;
BEGIN
  -- Only process if this is an adjustment being approved
  IF NEW.is_adjustment = true AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Get the full adjustment record
    SELECT * INTO adjustment_record FROM cash_transfers WHERE id = NEW.id;
    
    -- Determine the final amount to use
    final_amount := COALESCE(adjustment_record.approved_amount, adjustment_record.requested_amount);
    
    -- For loss adjustments, ensure the amount is negative
    IF adjustment_record.adjustment_type = 'loss' AND final_amount > 0 THEN
      final_amount := -ABS(final_amount);
    END IF;
    
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
      final_amount, -- This will be negative for losses
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

-- Step 7: Re-create the trigger (in case it needs refreshing)
DROP TRIGGER IF EXISTS process_adjustment_on_approval ON public.cash_transfers;
CREATE TRIGGER process_adjustment_on_approval
BEFORE UPDATE ON public.cash_transfers
FOR EACH ROW
EXECUTE FUNCTION process_approved_adjustment();