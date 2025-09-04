-- Force fix for petty cash balance
-- ==================================

-- First, let's see what we have
SELECT 
  'Before Fix' as status,
  cm.*,
  s.store_code
FROM cash_movements cm
LEFT JOIN stores s ON s.id = cm.store_id
WHERE cm.reference_type = 'cash_adjustment'
  AND cm.reference_id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8';

-- Force update to Adyar store
UPDATE cash_movements
SET store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
WHERE reference_id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8'
  AND reference_type = 'cash_adjustment';

-- Also update the cash_transfers
UPDATE cash_transfers
SET store_id = '10b4c60c-5c70-4e33-8194-dfbf5077cc23'
WHERE id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8';

-- Verify the fix
SELECT 
  'After Fix' as status,
  cm.*,
  s.store_code
FROM cash_movements cm
LEFT JOIN stores s ON s.id = cm.store_id
WHERE cm.reference_type = 'cash_adjustment'
  AND cm.reference_id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8';

-- Check the balance now
SELECT 
  'Final Balance Check' as check_type,
  get_current_cash_balance('10b4c60c-5c70-4e33-8194-dfbf5077cc23'::uuid, 'petty_cash') as adyar_petty_cash;