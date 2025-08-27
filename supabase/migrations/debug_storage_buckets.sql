-- Debug storage bucket configuration
-- Run this to check if buckets exist and their current settings

-- List all buckets
SELECT 
  'All Buckets' as section,
  id, 
  name, 
  file_size_limit,
  CASE 
    WHEN file_size_limit IS NULL THEN 'No limit set'
    ELSE (file_size_limit / 1024 / 1024)::text || ' MB'
  END as size_limit_display,
  allowed_mime_types,
  public,
  created_at
FROM storage.buckets 
ORDER BY created_at DESC;

-- Check specifically for our buckets
SELECT 
  'Our Buckets' as section,
  id, 
  name, 
  file_size_limit,
  CASE 
    WHEN file_size_limit IS NULL THEN 'No limit set'
    ELSE (file_size_limit / 1024 / 1024)::text || ' MB'
  END as size_limit_display,
  allowed_mime_types,
  public,
  created_at
FROM storage.buckets 
WHERE id IN ('handbills', 'expenses');

-- Check if buckets exist at all
SELECT 
  CASE 
    WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'handbills') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as handbills_bucket,
  CASE 
    WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'expenses') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as expenses_bucket;