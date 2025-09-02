-- ==========================================
-- CLEANUP TEST DATA FOR BETA TESTING
-- ==========================================
-- This migration removes all test transaction data while preserving
-- master data like stores, users, categories, and settings

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = 'replica';

-- 1. Clean up all transaction data
TRUNCATE TABLE 
  public.sales,
  public.expenses,
  public.returns,
  public.hand_bills,
  public.gift_vouchers,
  public.sales_orders,
  public.credit_bill_audit,
  public.cash_movements,
  public.cash_counts,
  public.cash_transfers,
  public.cash_balances,
  public.cash_deposits,
  public.daily_cash_positions,
  public.petty_cash_positions,
  public.deposit_day_mappings,
  public.voucher_transactions,
  public.cash_adjustments
CASCADE;

-- 2. Clean up customer data (optional - uncomment if you want to reset customers)
-- TRUNCATE TABLE public.customers CASCADE;

-- 3. Reset any sequences if needed
-- ALTER SEQUENCE IF EXISTS sales_id_seq RESTART WITH 1;

-- 4. Re-enable triggers
SET session_replication_role = 'origin';

-- 5. Add initial cash positions for active stores (optional)
-- This gives each store a starting position for the current date
INSERT INTO public.daily_cash_positions (store_id, business_date, opening_balance)
SELECT 
  id as store_id,
  CURRENT_DATE as business_date,
  0 as opening_balance
FROM public.stores
WHERE is_active = true
ON CONFLICT (store_id, business_date) DO NOTHING;

-- 6. Add initial petty cash positions for active stores
INSERT INTO public.petty_cash_positions (store_id, business_date, opening_balance)
SELECT 
  id as store_id,
  CURRENT_DATE as business_date,
  0 as opening_balance
FROM public.stores
WHERE is_active = true
ON CONFLICT (store_id, business_date) DO NOTHING;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Test data cleanup completed successfully';
  RAISE NOTICE 'All transaction data has been removed';
  RAISE NOTICE 'Master data (stores, users, categories) preserved';
  RAISE NOTICE 'Ready for beta testing';
END $$;