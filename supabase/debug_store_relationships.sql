-- Comprehensive Store ID Investigation Queries
-- ==========================================

-- 1. Check all stores in the system
SELECT 
  id as store_id,
  store_code,
  store_name,
  is_active,
  created_at
FROM stores
ORDER BY created_at DESC;

-- 2. Check user profile and their store access
SELECT 
  up.id as user_id,
  up.email,
  up.full_name,
  up.role,
  up.default_store_id,
  s.store_code as default_store_code,
  s.store_name as default_store_name
FROM user_profiles up
LEFT JOIN stores s ON s.id = up.default_store_id
WHERE up.is_active = true
ORDER BY up.full_name;

-- 3. Check user store access mapping
SELECT 
  usa.user_id,
  up.full_name as user_name,
  usa.store_id,
  s.store_code,
  s.store_name,
  usa.can_view,
  usa.can_edit,
  usa.can_approve
FROM user_store_access usa
JOIN user_profiles up ON up.id = usa.user_id
JOIN stores s ON s.id = usa.store_id
ORDER BY up.full_name, s.store_name;

-- 4. Check cash transfers and their store assignments
SELECT 
  ct.id as transfer_id,
  ct.store_id as transfer_store_id,
  s.store_code,
  s.store_name,
  ct.adjustment_type,
  ct.account_type,
  ct.requested_amount,
  ct.approved_amount,
  ct.status,
  ct.requested_by,
  ct.approved_by,
  ct.is_adjustment,
  ct.created_at
FROM cash_transfers ct
LEFT JOIN stores s ON s.id = ct.store_id
WHERE ct.is_adjustment = true
ORDER BY ct.created_at DESC;

-- 5. Check cash movements and their store assignments
SELECT 
  cm.id as movement_id,
  cm.store_id as movement_store_id,
  s.store_code,
  s.store_name,
  cm.movement_type,
  cm.amount,
  cm.account_type,
  cm.reference_type,
  cm.reference_id,
  cm.created_by,
  cm.created_at
FROM cash_movements cm
LEFT JOIN stores s ON s.id = cm.store_id
WHERE cm.reference_type = 'cash_adjustment'
ORDER BY cm.created_at DESC;

-- 6. Compare store IDs between cash_transfers and cash_movements
SELECT 
  'MISMATCH FOUND' as issue,
  ct.id as transfer_id,
  ct.store_id as transfer_store_id,
  cm.store_id as movement_store_id,
  s1.store_name as transfer_store_name,
  s2.store_name as movement_store_name,
  ct.approved_amount,
  ct.adjustment_type,
  ct.account_type
FROM cash_transfers ct
LEFT JOIN cash_movements cm ON cm.reference_id = ct.id AND cm.reference_type = 'cash_adjustment'
LEFT JOIN stores s1 ON s1.id = ct.store_id
LEFT JOIN stores s2 ON s2.id = cm.store_id
WHERE ct.is_adjustment = true
  AND ct.status IN ('approved', 'completed')
  AND ct.store_id != cm.store_id;

-- 7. Check if there are duplicate stores with similar names
SELECT 
  store_name,
  store_code,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as store_ids
FROM stores
GROUP BY store_name, store_code
HAVING COUNT(*) > 1;

-- 8. Find the specific user (Saleem Jamal) and their store associations
SELECT 
  up.id as user_id,
  up.full_name,
  up.email,
  up.role,
  up.default_store_id,
  ds.store_code as default_store_code,
  ds.store_name as default_store_name,
  STRING_AGG(DISTINCT s.store_name || ' (' || s.id::text || ')', ', ') as accessible_stores
FROM user_profiles up
LEFT JOIN stores ds ON ds.id = up.default_store_id
LEFT JOIN user_store_access usa ON usa.user_id = up.id
LEFT JOIN stores s ON s.id = usa.store_id
WHERE up.full_name ILIKE '%Saleem%' 
   OR up.email ILIKE '%saleem%'
GROUP BY up.id, up.full_name, up.email, up.role, up.default_store_id, ds.store_code, ds.store_name;

-- 9. Check for orphaned store IDs in cash_movements
SELECT 
  cm.store_id,
  COUNT(*) as movement_count,
  SUM(cm.amount) as total_amount,
  CASE 
    WHEN s.id IS NULL THEN 'ORPHANED - Store does not exist!'
    ELSE 'Valid Store'
  END as status
FROM cash_movements cm
LEFT JOIN stores s ON s.id = cm.store_id
GROUP BY cm.store_id, s.id
ORDER BY status DESC, movement_count DESC;

-- 10. Trace the exact flow for your adjustment
WITH adjustment_trace AS (
  SELECT 
    'Cash Transfer' as record_type,
    ct.id,
    ct.store_id,
    ct.requested_by,
    ct.approved_by,
    ct.requested_amount,
    ct.approved_amount,
    ct.created_at,
    ct.updated_at
  FROM cash_transfers ct
  WHERE ct.id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8'
  
  UNION ALL
  
  SELECT 
    'Cash Movement' as record_type,
    cm.id,
    cm.store_id,
    cm.created_by as requested_by,
    cm.created_by as approved_by,
    cm.amount as requested_amount,
    cm.amount as approved_amount,
    cm.created_at,
    cm.created_at as updated_at
  FROM cash_movements cm
  WHERE cm.reference_id = 'e9558aa7-51fe-46ca-86b7-ea2cd25e1ba8'
)
SELECT 
  at.*,
  s.store_code,
  s.store_name
FROM adjustment_trace at
LEFT JOIN stores s ON s.id = at.store_id
ORDER BY at.created_at;