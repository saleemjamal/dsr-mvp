-- Fix store ID mismatch in cash_movements table
-- The cash_movements record has wrong store_id

-- Check the issue
SELECT 
  'Cash Movement' as source,
  cm.store_id as store_id,
  cm.amount,
  cm.reference_id
FROM cash_movements cm
WHERE cm.reference_type = 'cash_adjustment'
UNION ALL
SELECT 
  'Cash Transfer' as source,
  ct.store_id as store_id,
  ct.approved_amount as amount,
  ct.id as reference_id
FROM cash_transfers ct
WHERE ct.is_adjustment = true AND ct.status = 'approved';

-- Fix: Update the cash_movements to have the correct store_id from cash_transfers
UPDATE cash_movements cm
SET store_id = ct.store_id
FROM cash_transfers ct
WHERE cm.reference_id = ct.id
  AND cm.reference_type = 'cash_adjustment'
  AND cm.store_id != ct.store_id;

-- Verify the fix
SELECT 
  cm.id,
  cm.store_id,
  s.store_name,
  cm.amount,
  cm.account_type,
  cm.description
FROM cash_movements cm
JOIN stores s ON s.id = cm.store_id
WHERE cm.reference_type = 'cash_adjustment'
ORDER BY cm.created_at DESC;

-- Check the balance after fix
SELECT 
  s.store_name,
  s.store_code,
  get_current_cash_balance(s.id, 'petty_cash') as petty_cash_balance,
  get_current_cash_balance(s.id, 'sales_cash') as sales_cash_balance
FROM stores s
WHERE s.id = '5a748a01-68bc-49b7-a822-446a687e965e';  -- Your actual store ID