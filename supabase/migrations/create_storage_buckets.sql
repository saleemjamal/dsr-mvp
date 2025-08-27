-- Create storage buckets for DSR MVP
-- This script creates the necessary storage buckets for images

-- Create handbills bucket for hand bill images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'handbills',
  'handbills', 
  false, -- Private bucket, requires authentication
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create expenses bucket for expense voucher images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expenses',
  'expenses',
  false, -- Private bucket, requires authentication  
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for handbills bucket
CREATE POLICY "Users can upload handbill images" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'handbills' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view handbill images" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'handbills' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their handbill images" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'handbills' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their handbill images" ON storage.objects  
FOR DELETE
USING (
  bucket_id = 'handbills' 
  AND auth.role() = 'authenticated'
);

-- Create RLS policies for expenses bucket
CREATE POLICY "Users can upload expense images" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'expenses' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view expense images" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'expenses' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their expense images" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'expenses' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their expense images" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'expenses' 
  AND auth.role() = 'authenticated'
);