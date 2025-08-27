-- Fix converted_sale_id column type in hand_bills table
-- Change from UUID to text to allow storing system-generated sale IDs

-- First, drop any existing foreign key constraint if it exists
-- Note: We're not adding it back because converted_sale_id stores external POS system IDs,
-- not references to records in our database
ALTER TABLE hand_bills 
DROP CONSTRAINT IF EXISTS hand_bills_converted_sale_id_fkey;

-- Change the column type from UUID to text/varchar
-- This allows storing various POS system sale ID formats (e.g., "S2025001", "INV-12345", "TEST123")
ALTER TABLE hand_bills 
ALTER COLUMN converted_sale_id TYPE text
USING converted_sale_id::text;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN hand_bills.converted_sale_id IS 'External sale ID from POS system after conversion (not a foreign key)';

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hand_bills' 
  AND column_name = 'converted_sale_id';