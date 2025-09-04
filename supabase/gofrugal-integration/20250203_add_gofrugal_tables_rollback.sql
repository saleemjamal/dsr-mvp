-- Rollback Script: Remove GoFrugal Integration Tables
-- Purpose: Clean rollback of all GoFrugal integration tables
-- Date: 2025-02-03
-- Author: DSR Development Team
-- 
-- USAGE: Run this script to completely remove all GoFrugal integration tables
-- WARNING: This will permanently delete all data in these tables

-- ==========================================
-- DROP TABLES IN REVERSE DEPENDENCY ORDER
-- ==========================================

-- Drop tables with foreign key dependencies first
DROP TABLE IF EXISTS gf_loyalty_transactions CASCADE;
DROP TABLE IF EXISTS gf_item_stock CASCADE;
DROP TABLE IF EXISTS gf_variance_alerts CASCADE;
DROP TABLE IF EXISTS gf_reconciliation_logs CASCADE;
DROP TABLE IF EXISTS gf_sales CASCADE;

-- Drop master tables
DROP TABLE IF EXISTS gf_customers CASCADE;
DROP TABLE IF EXISTS gf_items CASCADE;

-- ==========================================
-- VERIFICATION
-- ==========================================
-- Run this query to verify all tables have been removed:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name LIKE 'gf_%'
-- ORDER BY table_name;
-- 
-- Expected result: No rows returned