-- Fix: Update both cash_transfers and cash_movements to use the correct store (Adyar)
-- The adjustment was incorrectly created for Anna Nagar store instead of Adyar store

-- 1. First, verify the issue
SELECT 
  'BEFORE FIX' as status,
  ct.id,
  ct.store_id as transfer_store_id,
  s1.store_name as transfer_store_name,
  cm.store_id as movement_store_id,
  s2.store_name as movement_store_name,
  ct.requested_by,
  ct.approved_by
FROM cash_transfers ct
LEFT JOIN cash_movements cm ON cm.reference_id = ct.id AND cm.reference_type = 'cash_adjustment'
LEFT JOIN stores s1 ON s1.id = ct.store_id
LEFT JOIN stores s2 ON s2.id = cm.store_id
WHERE ct.id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8';

-- 2. Fix the cash_transfers record - change from Anna Nagar to Adyar
UPDATE cash_transfers
SET store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'  -- Adyar store ID
WHERE id IN ('4aa90e37-de4d-4e2d-a5b0-9feb871c2bb8', 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8')
  AND store_id = '5a748a01-68bc-49b7-a822-446a5f193e15';  -- Currently wrong Anna Nagar store

-- 3. Fix the cash_movements record - change from Anna Nagar to Adyar  
UPDATE cash_movements
SET store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'  -- Adyar store ID
WHERE reference_id IN ('4aa90e37-de4d-4e2d-a5b0-9feb871c2bb8', 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8')
  AND reference_type = 'cash_adjustment'
  AND store_id = '5a748a01-68bc-49b7-a822-446a5f193e15';  -- Currently wrong Anna Nagar store

-- 4. Verify the fix
SELECT 
  'AFTER FIX' as status,
  ct.id,
  ct.store_id as transfer_store_id,
  s1.store_name as transfer_store_name,
  cm.store_id as movement_store_id,
  s2.store_name as movement_store_name,
  ct.requested_by,
  ct.approved_by
FROM cash_transfers ct
LEFT JOIN cash_movements cm ON cm.reference_id = ct.id AND cm.reference_type = 'cash_adjustment'
LEFT JOIN stores s1 ON s1.id = ct.store_id
LEFT JOIN stores s2 ON s2.id = cm.store_id
WHERE ct.id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8';

-- 5. Check the balances for both stores
SELECT 
  s.store_code,
  s.store_name,
  get_current_cash_balance(s.id, 'petty_cash') as petty_cash_balance,
  get_current_cash_balance(s.id, 'sales_cash') as sales_cash_balance
FROM stores s
WHERE s.store_code IN ('ADY', 'ANN')
ORDER BY s.store_code;