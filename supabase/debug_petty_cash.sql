-- Comprehensive Debugging for Petty Cash Balance Issue
-- =====================================================

-- 1. Check which store is being queried
SELECT 
  id,
  store_code,
  store_name,
  is_active
FROM stores
WHERE store_code = 'ADY';

-- 2. Check cash_movements for Adyar store
SELECT 
  cm.id,
  cm.store_id,
  s.store_code,
  s.store_name,
  cm.movement_type,
  cm.account_type,
  cm.amount,
  cm.reference_type,
  cm.description,
  cm.created_at
FROM cash_movements cm
LEFT JOIN stores s ON s.id = cm.store_id
WHERE cm.account_type = 'petty_cash'
ORDER BY cm.created_at DESC;

-- 3. Test the get_current_cash_balance function with Adyar store ID
SELECT 
  'Direct Function Call' as test,
  get_current_cash_balance('10b4c60c-5c70-4e33-8194-dfbf5077cc23'::uuid, 'petty_cash') as petty_cash_balance;

-- 4. Check what the function is actually summing
SELECT 
  store_id,
  account_type,
  movement_type,
  amount,
  CASE 
    WHEN movement_type IN ('sale', 'advance', 'transfer_in', 'adjustment') 
    THEN amount
    WHEN movement_type IN ('expense', 'transfer_out', 'deposit')
    THEN -amount
    ELSE 0
  END as calculated_amount
FROM cash_movements
WHERE store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
  AND account_type = 'petty_cash';

-- 5. Manual calculation of what balance should be
SELECT 
  'Manual Calculation' as method,
  SUM(
    CASE 
      WHEN movement_type IN ('sale', 'advance', 'transfer_in', 'adjustment') 
      THEN amount
      WHEN movement_type IN ('expense', 'transfer_out', 'deposit')
      THEN -amount
      ELSE 0
    END
  ) as calculated_balance
FROM cash_movements
WHERE store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
  AND account_type = 'petty_cash';

-- 6. Check if there are ANY cash_movements for Adyar petty_cash
SELECT 
  COUNT(*) as movement_count,
  MIN(created_at) as first_movement,
  MAX(created_at) as last_movement
FROM cash_movements
WHERE store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
  AND account_type = 'petty_cash';

-- 7. Check cash_transfers status for Adyar
SELECT 
  ct.id,
  ct.store_id,
  s.store_code,
  ct.adjustment_type,
  ct.account_type,
  ct.requested_amount,
  ct.approved_amount,
  ct.status,
  ct.is_adjustment,
  ct.approved_by,
  ct.executed_at
FROM cash_transfers ct
LEFT JOIN stores s ON s.id = ct.store_id
WHERE ct.is_adjustment = true
  AND ct.store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
ORDER BY ct.created_at DESC;

-- 8. Check if the update actually worked
SELECT 
  'Cash Transfers' as table_name,
  COUNT(*) as adyar_records
FROM cash_transfers
WHERE store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
  AND is_adjustment = true
UNION ALL
SELECT 
  'Cash Movements' as table_name,
  COUNT(*) as adyar_records
FROM cash_movements
WHERE store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
  AND reference_type = 'cash_adjustment';

-- 9. Check the actual RPC function definition
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'get_current_cash_balance';