-- Add notes column to gift_vouchers table
-- This allows documenting voucher creation details, special instructions, or other relevant information

-- Add the notes column as optional text
ALTER TABLE gift_vouchers 
ADD COLUMN notes text;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN gift_vouchers.notes IS 'Optional notes for voucher creation details, special instructions, or documentation';

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'gift_vouchers' 
  AND column_name = 'notes';