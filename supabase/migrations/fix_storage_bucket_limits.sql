-- Fix storage bucket size limits
-- This script updates existing buckets to have proper size limits

-- Check current bucket configuration
SELECT 
  id, 
  name, 
  file_size_limit,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  allowed_mime_types,
  public
FROM storage.buckets 
WHERE id IN ('handbills', 'expenses');

-- Update handbills bucket to have proper 5MB limit
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'handbills';

-- Update expenses bucket to have proper 5MB limit  
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
WHERE id = 'expenses';

-- Verify the updates
SELECT 
  id, 
  name, 
  file_size_limit,
  file_size_limit / 1024 / 1024 as size_limit_mb,
  allowed_mime_types,
  public
FROM storage.buckets 
WHERE id IN ('handbills', 'expenses');