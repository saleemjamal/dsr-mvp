-- Fix the created_by null issue in cash_movements when processing adjustments
-- The trigger needs to use NEW values instead of SELECT which gets old values

-- Update the process_approved_adjustment function to use NEW record values
CREATE OR REPLACE FUNCTION process_approved_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is an adjustment being approved
  IF NEW.is_adjustment = true AND NEW.status = 'approved' AND OLD.status = 'pending' THEN
    
    -- Create cash movement record for the adjustment
    -- Use NEW values which contain the just-updated data
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
      NEW.store_id,
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
      -- Use NEW.approved_by which was just set by the UPDATE
      COALESCE(
        NEW.approved_by,      -- Should have the approver's name from the UPDATE
        NEW.requested_by,     -- Fallback to requester
        'System'              -- Final fallback
      )
    );
    
    -- Mark the adjustment as completed
    NEW.status := 'completed';
    NEW.executed_at := NOW();
    NEW.executed_by := COALESCE(NEW.approved_by, NEW.requested_by, 'System');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS process_adjustment_on_approval ON public.cash_transfers;
CREATE TRIGGER process_adjustment_on_approval
BEFORE UPDATE ON public.cash_transfers
FOR EACH ROW
EXECUTE FUNCTION process_approved_adjustment();

-- Also update the cash_movements table to allow 'System' as a valid created_by value
-- (This is already text type, so no schema change needed)