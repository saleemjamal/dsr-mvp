-- Debug query to check cash balance calculation

-- 1. Check if cash_movements has the adjustment record
SELECT 
  id,
  store_id,
  movement_date,
  movement_type,
  amount,
  account_type,
  reference_type,
  reference_id,
  description,
  created_by
FROM cash_movements
WHERE reference_type = 'cash_adjustment'
ORDER BY created_at DESC;

-- 2. Check all cash_movements for petty_cash
SELECT 
  movement_type,
  amount,
  account_type,
  description,
  created_at
FROM cash_movements  
WHERE account_type = 'petty_cash'
  AND store_id = '5a748a01-68bc-49b7-a822-446a687e965e'  -- Your store ID
ORDER BY created_at DESC;

-- 3. Test the get_current_cash_balance function directly
SELECT get_current_cash_balance(
  '5a748a01-68bc-49b7-a822-446a687e965e'::uuid,  -- Your store ID
  'petty_cash'
) as petty_cash_balance;

-- 4. Check if the trigger ran - look at cash_transfers status
SELECT 
  id,
  requested_amount,
  approved_amount,
  status,
  adjustment_type,
  account_type,
  is_adjustment,
  approved_by,
  executed_at,
  executed_by
FROM cash_transfers
WHERE is_adjustment = true
  AND store_id = '5a748a01-68bc-49b7-a822-446a687e965e'
ORDER BY created_at DESC;