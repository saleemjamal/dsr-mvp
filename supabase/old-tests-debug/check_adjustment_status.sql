-- Check the actual status of the cash adjustments
SELECT 
  id,
  store_id,
  adjustment_type,
  account_type,
  requested_amount,
  approved_amount,
  status,
  approved_by,
  executed_at,
  executed_by,
  created_at
FROM cash_transfers
WHERE is_adjustment = true
ORDER BY created_at DESC;

-- Check if cash movements were created
SELECT 
  cm.id,
  cm.store_id,
  cm.movement_type,
  cm.account_type,
  cm.amount,
  cm.reference_type,
  cm.reference_id,
  cm.created_by,
  cm.created_at
FROM cash_movements cm
WHERE cm.reference_type = 'cash_adjustment'
ORDER BY cm.created_at DESC;

-- Check if the trigger exists and is enabled
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgname = 'process_adjustment_on_approval';