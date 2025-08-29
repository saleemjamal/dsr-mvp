-- =====================================================
-- SAFELY DELETE ALL TRANSACTION DATA
-- =====================================================
-- This script removes all transaction data while preserving:
-- - Users and User Profiles
-- - Stores/Locations
-- - Expense Categories
-- - Customers
-- - Tender Types
-- - Email Whitelist
-- - All system configuration
-- =====================================================

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = 'replica';

BEGIN;

-- Wrap in DO block to use RAISE NOTICE
DO $$
DECLARE
    rows_deleted INTEGER;
BEGIN

-- =====================================================
-- STEP 1: Delete Cash Management Transactions
-- =====================================================

-- Delete cash transfers (requests for petty cash replenishment)
DELETE FROM public.cash_transfers;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % cash transfer records', rows_deleted;

-- Delete cash counts (daily cash counting records)
DELETE FROM public.cash_counts;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % cash count records', rows_deleted;

-- Delete cash movements (detailed cash flow records)
DELETE FROM public.cash_movements;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % cash movement records', rows_deleted;

-- Delete cash balances (daily balance records)
DELETE FROM public.cash_balances;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % cash balance records', rows_deleted;

-- =====================================================
-- STEP 2: Delete Sales Transactions
-- =====================================================

-- Delete regular sales
DELETE FROM public.sales;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % sales records', rows_deleted;

-- =====================================================
-- STEP 3: Delete Sales Orders (SO)
-- =====================================================

-- Delete sales orders
DELETE FROM public.sales_orders;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % sales order records', rows_deleted;

-- =====================================================
-- STEP 4: Delete Expenses
-- =====================================================

-- Delete expense records (keeping expense categories intact)
DELETE FROM public.expenses;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % expense records', rows_deleted;

-- =====================================================
-- STEP 5: Delete Gift Vouchers (GV)
-- =====================================================

-- Delete all gift vouchers
DELETE FROM public.gift_vouchers;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % gift voucher records', rows_deleted;

-- =====================================================
-- STEP 6: Delete Returns (RRN)
-- =====================================================

-- Delete all return records
DELETE FROM public.returns;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % return records', rows_deleted;

-- =====================================================
-- STEP 7: Delete Hand Bills (HB)
-- =====================================================

-- Delete all hand bill records
DELETE FROM public.hand_bills;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % hand bill records', rows_deleted;

-- =====================================================
-- STEP 8: Delete Damage Reports
-- =====================================================

-- Delete damage reports (operational data)
DELETE FROM public.damage_reports;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % damage report records', rows_deleted;

-- =====================================================
-- STEP 9: Reset Customer Balances (Keep customers)
-- =====================================================

-- Reset customer outstanding balances to 0 but keep customer records
UPDATE public.customers 
SET outstanding_balance = 0
WHERE outstanding_balance != 0;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Reset % customer balances', rows_deleted;

-- =====================================================
-- STEP 10: Clean User Sessions (Optional)
-- =====================================================

-- Delete old user sessions but keep user profiles
DELETE FROM public.user_sessions;
GET DIAGNOSTICS rows_deleted = ROW_COUNT;
RAISE NOTICE 'Deleted % user session records', rows_deleted;

-- Close the first DO block
END $$;

-- =====================================================
-- VERIFICATION: Check what data remains
-- =====================================================

-- This section just reports what master data is preserved
DO $$
DECLARE
    store_count integer;
    user_count integer;
    customer_count integer;
    category_count integer;
    whitelist_count integer;
BEGIN
    SELECT COUNT(*) INTO store_count FROM public.stores WHERE is_active = true;
    SELECT COUNT(*) INTO user_count FROM public.user_profiles WHERE is_active = true;
    SELECT COUNT(*) INTO customer_count FROM public.customers WHERE is_active = true;
    SELECT COUNT(*) INTO category_count FROM public.expense_categories WHERE is_active = true;
    SELECT COUNT(*) INTO whitelist_count FROM public.email_whitelist WHERE is_active = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MASTER DATA PRESERVED:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Active Stores: %', store_count;
    RAISE NOTICE 'Active Users: %', user_count;
    RAISE NOTICE 'Active Customers: %', customer_count;
    RAISE NOTICE 'Active Expense Categories: %', category_count;
    RAISE NOTICE 'Active Whitelist Entries: %', whitelist_count;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- VERIFICATION: Confirm transaction tables are empty
-- =====================================================

DO $$
DECLARE
    table_name text;
    row_count integer;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TRANSACTION TABLES STATUS (Should be 0):';
    RAISE NOTICE '========================================';
    
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'sales', 
            'sales_orders', 
            'expenses', 
            'gift_vouchers', 
            'returns', 
            'hand_bills',
            'cash_transfers',
            'cash_counts',
            'cash_movements',
            'cash_balances',
            'damage_reports'
        ])
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO row_count;
        RAISE NOTICE '% table: % records', table_name, row_count;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ TRANSACTION DATA CLEANUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE 'All transaction data has been deleted.';
    RAISE NOTICE 'Master data (users, stores, categories, customers) preserved.';
    RAISE NOTICE 'The system is ready for fresh testing or production use.';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: This action cannot be undone!';
    RAISE NOTICE 'Consider taking a backup before running this in production.';
END $$;