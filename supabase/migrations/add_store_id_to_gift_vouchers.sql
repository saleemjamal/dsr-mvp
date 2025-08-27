-- Add store_id to gift_vouchers table to track originating store
ALTER TABLE gift_vouchers 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Add comment to explain the field
COMMENT ON COLUMN gift_vouchers.store_id IS 'The store that issued/created this gift voucher. Voucher can be redeemed at any store.';