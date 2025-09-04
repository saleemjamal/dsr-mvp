-- ==========================================
-- FIX: Expense Double-Negative Issue
-- ==========================================
-- Problem: Expenses were being added to petty cash instead of subtracted
-- Cause: Double-negative - expenses stored as negative, then negated again
-- Solution: Simple sum since amounts are already correctly signed

-- Fix the get_current_cash_balance function
CREATE OR REPLACE FUNCTION get_current_cash_balance(
  p_store_id uuid,
  p_account_type varchar
)
RETURNS numeric AS $$
DECLARE
  current_balance numeric;
BEGIN
  -- Simply sum all movements for this account
  -- Amounts are already correctly signed:
  -- - Positive for money coming in (transfers_in, adjustments adding money)
  -- - Negative for money going out (expenses, deposits, transfers_out)
  SELECT COALESCE(SUM(amount), 0)
  INTO current_balance
  FROM cash_movements
  WHERE store_id = p_store_id
  AND account_type = p_account_type;
  
  RETURN current_balance;
END;
$$ LANGUAGE plpgsql;

-- Add comment for clarity
COMMENT ON FUNCTION get_current_cash_balance IS 'Returns current balance for an account by summing all movements. Amounts are already correctly signed in cash_movements table.';

-- Verify the fix by checking some balances
DO $$
DECLARE
  store_record RECORD;
  balance_before NUMERIC;
  balance_after NUMERIC;
BEGIN
  FOR store_record IN 
    SELECT DISTINCT store_id, account_type 
    FROM cash_movements 
    WHERE account_type = 'petty_cash'
    LIMIT 5
  LOOP
    balance_after := get_current_cash_balance(store_record.store_id, store_record.account_type);
    RAISE NOTICE 'Store %: Petty Cash Balance = %', 
      store_record.store_id, 
      balance_after;
  END LOOP;
END $$;